// Public endpoint for the "Audit gratuit de vos licences Microsoft" form.
// - validates the payload (honeypot + consent + required fields)
// - rate limits by IP (5 submissions / hour)
// - computes the lead score SERVER SIDE only
// - inserts the lead, sends confirmation + internal recap emails, creates in-app notifications
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://www.cloudmature.com'
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const isEmail = (s: unknown): s is string =>
  typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 255

const str = (v: unknown, max = 500) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

const arr = (v: unknown, max = 20) =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 200)).slice(0, max) : []

const DECISION_TITLES = [
  'Directeur informatique ou DSI',
  'Responsable informatique',
  'Directeur général',
  'Directeur administratif et financier',
  'Responsable des achats',
]
const BIG_USER_RANGES = ['51 à 100', '101 à 250', 'Plus de 250']

interface ScoreLine { label: string; points: number }

function computeScore(lead: {
  renewal_timeline: string
  users_to_cover: string
  main_needs: string[]
  job_title: string
}): { score: number; breakdown: ScoreLine[] } {
  const breakdown: ScoreLine[] = []

  if (lead.renewal_timeline === 'Dans moins de 30 jours') {
    breakdown.push({ label: 'Renouvellement dans moins de 30 jours', points: 40 })
  } else if (lead.renewal_timeline === 'Dans 1 à 3 mois') {
    breakdown.push({ label: 'Renouvellement dans 1 à 3 mois', points: 30 })
  } else if (lead.renewal_timeline === 'Dans 4 à 6 mois') {
    breakdown.push({ label: 'Renouvellement dans 4 à 6 mois', points: 20 })
  }

  if (BIG_USER_RANGES.includes(lead.users_to_cover)) {
    breakdown.push({ label: 'Plus de 50 utilisateurs à couvrir', points: 20 })
  }

  if (lead.main_needs.includes('Recevoir un devis')) {
    breakdown.push({ label: 'Besoin : Recevoir un devis', points: 15 })
  }
  if (lead.main_needs.includes('Renouveler mes licences')) {
    breakdown.push({ label: 'Besoin : Renouveler mes licences', points: 15 })
  }
  if (lead.main_needs.includes('Réduire mes coûts')) {
    breakdown.push({ label: 'Besoin : Réduire mes coûts', points: 10 })
  }

  if (DECISION_TITLES.includes(lead.job_title)) {
    breakdown.push({ label: 'Fonction décisionnaire', points: 15 })
  }

  return { score: breakdown.reduce((sum, b) => sum + b.points, 0), breakdown }
}

async function sendTemplate(templateName: string, recipient: string, templateData: Record<string, unknown>) {
  try {
    // Respect the suppression list before any send (also enforced downstream).
    const { data: suppressed } = await admin
      .from('suppressed_emails')
      .select('id')
      .eq('email', recipient.toLowerCase())
      .maybeSingle()
    if (suppressed) {
      await admin.from('email_send_log').insert({
        template_name: templateName,
        recipient_email: recipient,
        status: 'suppressed',
      })
      return
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ templateName, recipientEmail: recipient, templateData }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('send-transactional-email failed', templateName, recipient, text)
      await admin.from('email_send_log').insert({
        template_name: templateName,
        recipient_email: recipient,
        status: 'failed',
        error_message: text.slice(0, 500),
      })
    }
  } catch (e) {
    console.error('sendTemplate error', e)
    await admin.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: String(e).slice(0, 500),
    })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  // Honeypot: silently accept but do nothing.
  if (str(body.website)) return json({ success: true })

  // Rate limit
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await admin
    .from('lead_submission_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since)
  if ((count ?? 0) >= RATE_LIMIT) {
    return json({ error: 'rate_limited', message: 'Trop de demandes envoyées depuis cette connexion. Réessayez plus tard.' }, 429)
  }
  await admin.from('lead_submission_attempts').insert({ ip })

  // Validation
  const company_name = str(body.company_name, 200)
  const full_name = str(body.full_name, 150)
  const email = str(body.email, 255)
  const consent = body.consent_given === true

  if (!company_name || !full_name) return json({ error: 'missing_fields' }, 400)
  if (!isEmail(email)) return json({ error: 'invalid_email' }, 400)
  if (!consent) return json({ error: 'consent_required' }, 400)

  const { data: settings } = await admin.from('marketing_settings').select('*').eq('id', 1).maybeSingle()
  const urgentThreshold = settings?.score_urgent_threshold ?? 60
  const qualifiedThreshold = settings?.score_qualified_threshold ?? 35
  const notificationEmail = settings?.notification_email ?? 'info@cloudmature.com'
  const autoConfirmation = settings?.auto_confirmation_enabled !== false

  const lead = {
    campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
    source: 'formulaire_audit_microsoft',
    utm_source: str(body.utm_source, 100) || null,
    utm_medium: str(body.utm_medium, 100) || null,
    utm_campaign: str(body.utm_campaign, 100) || null,
    company_name,
    sector: str(body.sector, 120) || null,
    city: str(body.city, 120) || null,
    employee_count_range: str(body.employee_count_range, 50) || null,
    uses_microsoft: str(body.uses_microsoft, 50) || null,
    microsoft_products: arr(body.microsoft_products),
    users_to_cover: str(body.users_to_cover, 50) || null,
    renewal_timeline: str(body.renewal_timeline, 80) || null,
    has_current_provider: str(body.has_current_provider, 60) || null,
    main_needs: arr(body.main_needs, 3),
    additional_info: str(body.additional_info, 4000) || null,
    full_name,
    job_title: str(body.job_title, 120) || null,
    email: email.toLowerCase(),
    phone: str(body.phone, 40) || null,
    preferred_contact_method: str(body.preferred_contact_method, 60) || null,
    contact_timing: str(body.contact_timing, 60) || null,
    preferred_datetime: typeof body.preferred_datetime === 'string' && body.preferred_datetime
      ? body.preferred_datetime
      : null,
    consent_given: true,
    consent_text: str(body.consent_text, 2000) || settings?.consent_text || null,
    consent_timestamp: new Date().toISOString(),
    consent_ip: ip,
  }

  const { score, breakdown } = computeScore({
    renewal_timeline: lead.renewal_timeline ?? '',
    users_to_cover: lead.users_to_cover ?? '',
    main_needs: lead.main_needs,
    job_title: lead.job_title ?? '',
  })

  const priority = score >= urgentThreshold ? 'urgent' : score >= qualifiedThreshold ? 'qualifie' : 'a_entretenir'
  const priorityLabel = priority === 'urgent' ? 'Urgent' : priority === 'qualifie' ? 'Qualifié' : 'À entretenir'

  const { data: inserted, error: insertError } = await admin
    .from('marketing_leads')
    .insert({ ...lead, score, priority, score_breakdown: breakdown, status: 'nouveau' })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('Lead insert failed', insertError)
    return json({ error: 'insert_failed' }, 500)
  }

  const leadId = inserted.id
  const leadUrl = `${SITE_URL}/admin?tab=marketing-leads&lead=${leadId}`

  if (lead.campaign_id) {
    await admin.from('campaign_events').insert({
      campaign_id: lead.campaign_id,
      type: 'submit',
      lead_id: leadId,
      source: lead.utm_source,
      user_agent: req.headers.get('user-agent'),
    })
  }

  // 2. Confirmation to the prospect
  if (autoConfirmation) {
    await sendTemplate('audit-microsoft-confirmation', lead.email, {
      fullName: lead.full_name,
      companyName: lead.company_name,
      renewalTimeline: lead.renewal_timeline,
      mainNeeds: lead.main_needs,
    })
  }

  // 3. Internal recap
  const fields = [
    { label: 'Entreprise', value: lead.company_name },
    { label: 'Secteur', value: lead.sector ?? '' },
    { label: 'Ville', value: lead.city ?? '' },
    { label: 'Nombre d\'employés', value: lead.employee_count_range ?? '' },
    { label: 'Utilise Microsoft', value: lead.uses_microsoft ?? '' },
    { label: 'Solutions Microsoft', value: lead.microsoft_products.join(', ') },
    { label: 'Utilisateurs à couvrir', value: lead.users_to_cover ?? '' },
    { label: 'Échéance de renouvellement', value: lead.renewal_timeline ?? '' },
    { label: 'Fournisseur actuel', value: lead.has_current_provider ?? '' },
    { label: 'Besoins principaux', value: lead.main_needs.join(', ') },
    { label: 'Informations complémentaires', value: lead.additional_info ?? '' },
    { label: 'Contact', value: lead.full_name },
    { label: 'Fonction', value: lead.job_title ?? '' },
    { label: 'E-mail', value: lead.email },
    { label: 'Téléphone', value: lead.phone ?? '' },
    { label: 'Moyen de contact préféré', value: lead.preferred_contact_method ?? '' },
    { label: 'Disponibilité', value: lead.contact_timing ?? '' },
    { label: 'Date souhaitée', value: lead.preferred_datetime ?? '' },
    { label: 'Consentement', value: `Accordé le ${new Date(lead.consent_timestamp).toLocaleString('fr-FR')}` },
  ]

  await sendTemplate('audit-microsoft-notification', notificationEmail, {
    companyName: lead.company_name,
    fullName: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    score,
    priority,
    priorityLabel,
    isUrgent: priority === 'urgent',
    leadUrl,
    fields,
    scoreBreakdown: breakdown,
  })

  // 4. In-app notifications for admin / gestionnaire / agent
  const { data: teamRoles } = await admin
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'gestionnaire', 'agent'])

  const teamIds = [...new Set((teamRoles ?? []).map((r: { user_id: string }) => r.user_id))]

  if (teamIds.length > 0) {
    const isUrgent = priority === 'urgent'
    await admin.from('user_notifications').insert(
      teamIds.map((uid) => ({
        user_id: uid,
        category: 'marketing',
        level: isUrgent ? 'urgent' : 'info',
        title: isUrgent ? `Prospect prioritaire : ${lead.company_name}` : `Nouveau prospect : ${lead.company_name}`,
        body: isUrgent
          ? `Nouveau prospect prioritaire : renouvellement Microsoft prévu dans moins de six mois. ${lead.company_name} — score ${score} — ${lead.full_name}${lead.phone ? ` (${lead.phone})` : ''}.`
          : `${lead.full_name} — score ${score} — ${priorityLabel}.`,
        link: `/admin?tab=marketing-leads&lead=${leadId}`,
        meta: { lead_id: leadId, score, priority },
      })),
    )
  }

  // 5. Extra alert to the sales team when the lead is urgent
  if (priority === 'urgent') {
    const salesIds: string[] = (settings?.sales_user_ids ?? []) as string[]
    if (salesIds.length > 0) {
      const { data: salesProfiles } = await admin
        .from('profiles')
        .select('user_id')
        .in('user_id', salesIds)
      const ids = (salesProfiles ?? []).map((p: { user_id: string }) => p.user_id)
      if (ids.length > 0) {
        await admin.from('user_notifications').insert(
          ids.map((uid) => ({
            user_id: uid,
            category: 'marketing',
            level: 'urgent',
            title: `Action commerciale immédiate : ${lead.company_name}`,
            body: `Nouveau prospect prioritaire : renouvellement Microsoft prévu dans moins de six mois. ${lead.company_name} — score ${score} — ${lead.full_name}${lead.phone ? ` (${lead.phone})` : ''}.`,
            link: `/admin?tab=marketing-leads&lead=${leadId}`,
            meta: { lead_id: leadId, score, priority },
          })),
        )
      }
    }
  }

  return json({ success: true, leadId })
})
