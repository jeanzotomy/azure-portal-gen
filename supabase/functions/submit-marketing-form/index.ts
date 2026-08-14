// Point d'entrée public du générateur de formulaires marketing.
// - `action: "start"`  : enregistre une soumission commencée (taux d'abandon)
// - `action: "submit"` : valide, score, crée/complète le prospect, notifie
//
// Toute la validation et tout le scoring sont faits ICI, jamais dans le navigateur.
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

type AnswerValue = string | string[]
type Answers = Record<string, AnswerValue>

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const arr = (v: unknown, max = 30) =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 300)).slice(0, max) : []
const asText = (v: AnswerValue | undefined) =>
  Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : ''
const asArray = (v: AnswerValue | undefined) =>
  Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 255

interface FormRow {
  id: string
  campaign_id: string | null
  title: string
  slug: string
  status: string
  submit_label: string
  notification_email: string | null
  auto_confirmation_enabled: boolean
  consent_required: boolean
  consent_text: string | null
  score_urgent_threshold: number
  score_qualified_threshold: number
  closes_at: string | null
  max_submissions: number | null
}

interface FieldRow {
  id: string
  position: number
  section: string | null
  field_key: string
  label: string
  type: string
  options: unknown
  required: boolean
  max_selections: number | null
  min_value: number | null
  max_value: number | null
  regex_validation: string | null
  maps_to: string | null
  visible_when: { field_key?: string; operator?: string; values?: string[] } | null
}

interface RuleRow {
  field_key: string
  operator: string
  value: unknown
  points: number
  label: string
}

const NON_ANSWERABLE = ['titre_section']
const MULTI_TYPES = ['choix_multiple']
const ARRAY_LEAD_COLUMNS = ['microsoft_products', 'main_needs']
const TIMESTAMP_LEAD_COLUMNS = ['preferred_datetime']
const ALLOWED_LEAD_COLUMNS = new Set([
  'company_name', 'full_name', 'email', 'phone', 'job_title', 'city', 'sector',
  'employee_count_range', 'users_to_cover', 'renewal_timeline', 'uses_microsoft',
  'has_current_provider', 'microsoft_products', 'main_needs', 'additional_info',
  'preferred_contact_method', 'contact_timing', 'preferred_datetime',
])

/* ---------------- visibilité conditionnelle ---------------- */
function isVisible(field: FieldRow, answers: Answers): boolean {
  const rule = field.visible_when
  if (!rule?.field_key || !rule.operator) return true
  const raw = answers[rule.field_key]
  const values = Array.isArray(rule.values) ? rule.values : []
  switch (rule.operator) {
    case 'est':
      return Array.isArray(raw) ? raw.some((v) => values.includes(v)) : values.includes(asText(raw))
    case 'nest_pas':
      return Array.isArray(raw) ? !raw.some((v) => values.includes(v)) : !values.includes(asText(raw))
    case 'contient':
      return asArray(raw).some((v) => values.includes(v))
    case 'est_rempli':
      return Array.isArray(raw) ? raw.length > 0 : !!asText(raw).trim()
    default:
      return true
  }
}

/* ---------------- scoring ---------------- */
interface ScoreLine { label: string; points: number }

function ruleMatches(operator: string, values: string[], answer: AnswerValue | undefined): boolean {
  switch (operator) {
    case 'est':
      return Array.isArray(answer) ? answer.some((v) => values.includes(v)) : values.includes(asText(answer))
    case 'contient':
      return asArray(answer).some((v) => values.includes(v))
    case 'superieur_a': {
      const threshold = Number(values[0])
      const n = Number(asText(answer))
      return !Number.isNaN(threshold) && !Number.isNaN(n) && n > threshold
    }
    case 'est_rempli':
      return Array.isArray(answer) ? answer.length > 0 : !!asText(answer).trim()
    default:
      return false
  }
}

function computeScore(rules: RuleRow[], answers: Answers) {
  const breakdown: ScoreLine[] = []
  for (const rule of rules) {
    const values = Array.isArray(rule.value)
      ? (rule.value as unknown[]).map((v) => String(v))
      : rule.value === null || rule.value === undefined ? [] : [String(rule.value)]
    if (ruleMatches(rule.operator, values, answers[rule.field_key])) {
      breakdown.push({ label: rule.label, points: rule.points })
    }
  }
  return { score: breakdown.reduce((s, b) => s + b.points, 0), breakdown }
}

/* ---------------- e-mails ---------------- */
async function sendTemplate(templateName: string, recipient: string, templateData: Record<string, unknown>) {
  try {
    const { data: suppressed } = await admin
      .from('suppressed_emails').select('id').eq('email', recipient.toLowerCase()).maybeSingle()
    if (suppressed) {
      await admin.from('email_send_log').insert({
        template_name: templateName, recipient_email: recipient, status: 'suppressed',
      })
      return
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ templateName, recipientEmail: recipient, templateData }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('send-transactional-email failed', templateName, text)
      await admin.from('email_send_log').insert({
        template_name: templateName, recipient_email: recipient,
        status: 'failed', error_message: text.slice(0, 500),
      })
    }
  } catch (e) {
    console.error('sendTemplate error', e)
    await admin.from('email_send_log').insert({
      template_name: templateName, recipient_email: recipient,
      status: 'failed', error_message: String(e).slice(0, 500),
    })
  }
}

/* ---------------- chargement de la définition ---------------- */
async function loadDefinition(slug: string) {
  const { data: form } = await admin
    .from('marketing_forms').select('*').eq('slug', slug).maybeSingle()
  if (!form) return null
  const [{ data: fields }, { data: rules }] = await Promise.all([
    admin.from('marketing_form_fields').select('*').eq('form_id', form.id).order('position'),
    admin.from('marketing_form_scoring_rules').select('*').eq('form_id', form.id).order('position'),
  ])
  return {
    form: form as FormRow,
    fields: (fields ?? []) as FieldRow[],
    rules: (rules ?? []) as RuleRow[],
  }
}

function sanitizeAnswers(fields: FieldRow[], raw: unknown): Answers {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Answers = {}
  for (const f of fields) {
    if (NON_ANSWERABLE.includes(f.type)) continue
    const v = input[f.field_key]
    if (v === undefined || v === null) continue
    out[f.field_key] = MULTI_TYPES.includes(f.type) ? arr(v) : str(v, f.type === 'texte_long' ? 4000 : 500)
  }
  return out
}

/* ---------------- handler ---------------- */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent')

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

  const slug = str(body.slug, 120)
  if (!slug) return json({ error: 'form_not_found' }, 404)

  const definition = await loadDefinition(slug)
  if (!definition) return json({ error: 'form_not_found' }, 404)
  const { form, fields, rules } = definition

  if (form.status !== 'publiee') return json({ error: 'form_closed' }, 403)
  if (form.closes_at && new Date(form.closes_at).getTime() < Date.now())
    return json({ error: 'form_expired' }, 403)

  const utm = (body.utm && typeof body.utm === 'object' ? body.utm : {}) as Record<string, string>
  const answers = sanitizeAnswers(fields, body.answers)

  /* ---------- action: start ---------- */
  if (body.action === 'start') {
    const { data, error } = await admin
      .from('marketing_form_submissions')
      .insert({
        form_id: form.id, answers, completed: false,
        utm, user_agent: userAgent, ip,
      })
      .select('id').single()
    if (error) { console.error('start insert failed', error); return json({ success: false }, 200) }
    return json({ success: true, submissionId: data.id })
  }

  /* ---------- action: submit ---------- */
  // Honeypot : on accepte silencieusement sans rien créer.
  if (str(body.website)) return json({ success: true })

  // Limite : 5 soumissions par heure et par IP
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count: attempts } = await admin
    .from('lead_submission_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip).gte('created_at', since)
  if ((attempts ?? 0) >= RATE_LIMIT) {
    return json({
      error: 'rate_limited',
      message: 'Trop de demandes envoyées depuis cette connexion. Réessayez plus tard.',
    }, 429)
  }
  await admin.from('lead_submission_attempts').insert({ ip })

  // Plafond de soumissions
  if (form.max_submissions) {
    const { count: done } = await admin
      .from('marketing_form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', form.id).eq('completed', true)
    if ((done ?? 0) >= form.max_submissions) return json({ error: 'max_submissions_reached' }, 403)
  }

  // Consentement
  const consentGiven = body.consent_given === true
  if (form.consent_required && !consentGiven) return json({ error: 'consent_required' }, 400)

  // Validation champ par champ (uniquement sur les champs réellement visibles)
  const visible = fields.filter((f) => !NON_ANSWERABLE.includes(f.type) && isVisible(f, answers))
  for (const f of visible) {
    const value = answers[f.field_key]
    if (MULTI_TYPES.includes(f.type)) {
      const list = asArray(value)
      if (f.required && list.length === 0) return json({ error: 'missing_fields', message: `« ${f.label} » est obligatoire.` }, 400)
      if (f.max_selections && list.length > f.max_selections)
        return json({ error: 'invalid_field', message: `« ${f.label} » : ${f.max_selections} réponses maximum.` }, 400)
      continue
    }
    const text = asText(value).trim()
    if (f.required && !text) return json({ error: 'missing_fields', message: `« ${f.label} » est obligatoire.` }, 400)
    if (!text) continue
    if (f.type === 'email' && !isEmail(text)) return json({ error: 'invalid_email' }, 400)
    if (f.type === 'telephone' && text.replace(/\D/g, '').length < 8)
      return json({ error: 'invalid_field', message: `« ${f.label} » : numéro invalide.` }, 400)
    if (f.type === 'nombre') {
      const n = Number(text)
      if (Number.isNaN(n)) return json({ error: 'invalid_field', message: `« ${f.label} » doit être un nombre.` }, 400)
      if (f.min_value !== null && n < Number(f.min_value)) return json({ error: 'invalid_field', message: `« ${f.label} » : minimum ${f.min_value}.` }, 400)
      if (f.max_value !== null && n > Number(f.max_value)) return json({ error: 'invalid_field', message: `« ${f.label} » : maximum ${f.max_value}.` }, 400)
    }
    if (f.regex_validation) {
      try {
        if (!new RegExp(f.regex_validation).test(text))
          return json({ error: 'invalid_field', message: `« ${f.label} » : format invalide.` }, 400)
      } catch { /* expression invalide côté éditeur : ignorée */ }
    }
  }

  // Répartition des réponses vers les colonnes de `marketing_leads`
  const leadPayload: Record<string, unknown> = {}
  for (const f of visible) {
    if (!f.maps_to || !ALLOWED_LEAD_COLUMNS.has(f.maps_to)) continue
    const value = answers[f.field_key]
    if (value === undefined) continue
    if (ARRAY_LEAD_COLUMNS.includes(f.maps_to)) {
      leadPayload[f.maps_to] = asArray(value)
    } else if (TIMESTAMP_LEAD_COLUMNS.includes(f.maps_to)) {
      const t = asText(value)
      leadPayload[f.maps_to] = t ? new Date(t).toISOString() : null
    } else {
      leadPayload[f.maps_to] = asText(value)
    }
  }

  const email = String(leadPayload.email ?? '').toLowerCase().trim()
  const companyName = String(leadPayload.company_name ?? '').trim() || form.title
  const fullName = String(leadPayload.full_name ?? '').trim() || 'Contact'
  if (!email || !isEmail(email)) return json({ error: 'invalid_email' }, 400)
  leadPayload.email = email
  leadPayload.company_name = companyName
  leadPayload.full_name = fullName

  const { score, breakdown } = computeScore(rules, answers)
  const priority = score >= form.score_urgent_threshold
    ? 'urgent'
    : score >= form.score_qualified_threshold ? 'qualifie' : 'a_entretenir'
  const priorityLabel = priority === 'urgent' ? 'Urgent' : priority === 'qualifie' ? 'Qualifié' : 'À entretenir'

  const consentText = str(body.consent_text, 2000) || form.consent_text || null
  const nowIso = new Date().toISOString()

  // Déduplication par adresse e-mail
  const { data: existing } = await admin
    .from('marketing_leads')
    .select('id, score, score_breakdown')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  let leadId: string
  let isNewLead = true

  const common = {
    ...leadPayload,
    campaign_id: form.campaign_id,
    source: form.slug,
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    consent_given: consentGiven || !form.consent_required,
    consent_text: consentText,
    consent_timestamp: nowIso,
    consent_ip: ip,
  }

  if (existing) {
    isNewLead = false
    leadId = existing.id
    const keepExisting = (existing.score ?? 0) >= score
    const { error: updateError } = await admin
      .from('marketing_leads')
      .update({
        ...common,
        score: keepExisting ? existing.score : score,
        priority: keepExisting ? undefined : priority,
        score_breakdown: keepExisting ? existing.score_breakdown : breakdown,
      })
      .eq('id', leadId)
    if (updateError) { console.error('lead update failed', updateError); return json({ error: 'insert_failed' }, 500) }

    await admin.from('lead_activities').insert({
      lead_id: leadId,
      type: 'note',
      content: `Nouvelle soumission de formulaire : « ${form.title} » — score ${score} (${priorityLabel}).`,
    })
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('marketing_leads')
      .insert({ ...common, score, priority, score_breakdown: breakdown, status: 'nouveau' })
      .select('id').single()
    if (insertError || !inserted) {
      console.error('lead insert failed', insertError)
      return json({ error: 'insert_failed' }, 500)
    }
    leadId = inserted.id
  }

  // Soumission : compléter la ligne commencée ou en créer une
  const submissionId = str(body.submissionId, 64)
  const submissionPayload = {
    form_id: form.id, lead_id: leadId, answers, score,
    priority, completed: true, submitted_at: nowIso,
    utm, user_agent: userAgent, ip,
  }
  if (submissionId) {
    const { error } = await admin
      .from('marketing_form_submissions').update(submissionPayload).eq('id', submissionId)
    if (error) await admin.from('marketing_form_submissions').insert(submissionPayload)
  } else {
    await admin.from('marketing_form_submissions').insert(submissionPayload)
  }

  const leadUrl = `${SITE_URL}/admin?tab=marketing-leads&lead=${leadId}`

  if (form.campaign_id) {
    await admin.from('campaign_events').insert({
      campaign_id: form.campaign_id, type: 'submit', lead_id: leadId,
      source: utm.utm_source ?? null, user_agent: userAgent,
    })
  }

  // Récapitulatif générique des réponses du formulaire concerné
  const answerFields = visible
    .filter((f) => answers[f.field_key] !== undefined && asText(answers[f.field_key]) !== '')
    .map((f) => ({ label: f.label, value: asText(answers[f.field_key]) }))
  answerFields.push({
    label: 'Consentement',
    value: `Accordé le ${new Date(nowIso).toLocaleString('fr-FR')}`,
  })

  const { data: settings } = await admin
    .from('marketing_settings').select('*').limit(1).maybeSingle()
  const notificationEmail =
    form.notification_email || settings?.notification_email || 'info@cloudmature.com'

  // Confirmation au prospect
  if (form.auto_confirmation_enabled) {
    await sendTemplate('marketing-form-confirmation', email, {
      fullName,
      companyName,
      formTitle: form.title,
      highlights: answerFields.slice(0, 5),
    })
  }

  // Récapitulatif interne
  await sendTemplate('marketing-form-notification', notificationEmail, {
    formTitle: form.title,
    companyName, fullName, email,
    phone: String(leadPayload.phone ?? ''),
    score, priority, priorityLabel,
    isUrgent: priority === 'urgent',
    isReturning: !isNewLead,
    leadUrl,
    fields: answerFields,
    scoreBreakdown: breakdown,
  })

  // Notifications in-app
  const { data: teamRoles } = await admin
    .from('user_roles').select('user_id').in('role', ['admin', 'gestionnaire', 'agent'])
  const teamIds = [...new Set((teamRoles ?? []).map((r: { user_id: string }) => r.user_id))]
  const isUrgent = priority === 'urgent'

  if (teamIds.length > 0) {
    await admin.from('user_notifications').insert(
      teamIds.map((uid) => ({
        user_id: uid,
        category: 'marketing',
        level: isUrgent ? 'urgent' : 'info',
        title: isUrgent ? `Prospect prioritaire : ${companyName}` : `Nouveau prospect : ${companyName}`,
        body: `${form.title} — ${fullName} — score ${score} — ${priorityLabel}.`,
        link: `/admin?tab=marketing-leads&lead=${leadId}`,
        meta: { lead_id: leadId, form_id: form.id, score, priority },
      })),
    )
  }

  // Alerte renforcée pour l'équipe commerciale
  if (isUrgent) {
    const salesIds: string[] = (settings?.sales_user_ids ?? []) as string[]
    if (salesIds.length > 0) {
      await admin.from('user_notifications').insert(
        salesIds.map((uid) => ({
          user_id: uid,
          category: 'marketing',
          level: 'urgent',
          title: `Action commerciale immédiate : ${companyName}`,
          body: `${form.title} — prospect prioritaire. ${companyName} — score ${score} — ${fullName}${leadPayload.phone ? ` (${leadPayload.phone})` : ''}.`,
          link: `/admin?tab=marketing-leads&lead=${leadId}`,
          meta: { lead_id: leadId, form_id: form.id, score, priority },
        })),
      )
    }
  }

  return json({ success: true, leadId, score, priority })
})
