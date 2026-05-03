import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://cloudmature.com'
const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'
const FROM_ADDRESS = 'rh@cloudmature.com'
const OUTLOOK_GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_outlook'

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function wrap(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="background:#ffffff;font-family:'Inter',Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:0 auto;padding:20px 25px;">
    <img src="${LOGO_URL}" alt="${SITE_NAME}" width="48" height="48" style="margin:0 0 20px"/>
    ${bodyHtml}
    <p style="font-size:13px;color:#0099cc;font-weight:600;margin:30px 0 0;">L'équipe ${SITE_NAME}</p>
  </div>
</body></html>`
}

function trackingBlock(trackingId?: string): string {
  if (!trackingId) return ''
  const url = `${SITE_URL}/candidature/${encodeURIComponent(trackingId)}`
  return `
    <div style="background:#f5fafd;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
      <p style="font-size:12px;color:#64748b;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">Numéro de suivi</p>
      <p style="font-size:18px;color:#0099cc;margin:0 0 10px;font-weight:700;letter-spacing:1px;">${escapeHtml(trackingId)}</p>
      <a href="${url}" style="display:inline-block;background:#0099cc;color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">Suivre ma candidature</a>
    </div>`
}

function buildEmail(
  status: 'received' | 'en_revue' | 'entretien' | 'acceptee' | 'refusee',
  data: { candidateName?: string; jobTitle?: string; interviewMessage?: string; activationUrl?: string; trackingId?: string },
): { subject: string; html: string } {
  const name = escapeHtml(data.candidateName || '')
  const job = escapeHtml(data.jobTitle || 'le poste')
  const tracking = trackingBlock(data.trackingId)

  if (status === 'received') {
    const subject = `Nous avons bien reçu votre candidature — ${data.jobTitle || 'CloudMature'}`
    const html = wrap(subject, `
      <h1 style="font-size:22px;color:#161f2e;margin:0 0 20px;">Candidature bien reçue 🎯</h1>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Merci pour votre candidature au poste de <strong>${job}</strong>. Nous l'avons bien reçue et notre équipe RH va l'examiner dans les meilleurs délais.</p>
      ${tracking}
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 16px;">Conservez ce numéro : il vous permettra de consulter à tout moment l'état d'avancement de votre dossier.</p>
    `)
    return { subject, html }
  }

  if (status === 'en_revue') {
    const subject = `Votre candidature pour ${data.jobTitle || 'le poste'} est en cours d'examen`
    const html = wrap(subject, `
      <h1 style="font-size:22px;color:#161f2e;margin:0 0 20px;">Votre candidature est en cours d'examen</h1>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Nous vous remercions de l'intérêt que vous portez à ${SITE_NAME}. Votre candidature pour le poste de <strong>${job}</strong> a bien été reçue et est actuellement en cours d'examen par notre équipe RH.</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Nous reviendrons vers vous dans les meilleurs délais avec la suite du processus.</p>
      ${tracking}
    `)
    return { subject, html }
  }

  if (status === 'entretien') {
    const subject = `Invitation à un entretien — ${data.jobTitle || 'votre candidature'}`
    const msg = escapeHtml(data.interviewMessage || '').replace(/\n/g, '<br/>')
    const msgBlock = msg
      ? `<div style="background:#f5fafd;border-left:4px solid #0099cc;padding:16px 18px;margin:0 0 20px;border-radius:6px;font-size:14px;color:#2d3748;line-height:1.6;">${msg}</div>`
      : `<p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Notre équipe RH vous contactera prochainement pour convenir d'une date.</p>`
    const html = wrap(subject, `
      <h1 style="font-size:22px;color:#161f2e;margin:0 0 20px;">Vous êtes invité(e) à un entretien</h1>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Suite à l'examen de votre candidature pour le poste de <strong>${job}</strong>, nous avons le plaisir de vous inviter à un entretien.</p>
      ${msgBlock}
      ${tracking}
    `)
    return { subject, html }
  }

  if (status === 'refusee') {
    const subject = `Suite donnée à votre candidature — ${data.jobTitle || 'le poste'}`
    const html = wrap(subject, `
      <h1 style="font-size:22px;color:#161f2e;margin:0 0 20px;">Suite donnée à votre candidature</h1>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Nous vous remercions sincèrement pour l'intérêt que vous avez porté à ${SITE_NAME} et pour le temps consacré à votre candidature au poste de <strong>${job}</strong>.</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Après une étude attentive de votre profil, nous sommes au regret de ne pouvoir donner une suite favorable à votre candidature.</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Nous vous souhaitons plein succès dans la poursuite de vos projets professionnels.</p>
      ${tracking}
    `)
    return { subject, html }
  }

  // acceptee
  const subject = `Bienvenue chez ${SITE_NAME} — votre candidature est acceptée 🎉`
  const url = escapeHtml(data.activationUrl || `${SITE_URL}/auth?welcome=1`)
  const html = wrap(subject, `
    <h1 style="font-size:22px;color:#161f2e;margin:0 0 20px;">Félicitations ${name} !</h1>
    <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Nous avons le plaisir de vous informer que votre candidature au poste de <strong>${job}</strong> a été retenue.</p>
    <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Pour finaliser votre intégration, activez votre accès au portail collaborateur en cliquant sur le bouton ci-dessous :</p>
    <p style="margin:24px 0;"><a href="${url}" style="background:#0099cc;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Activer mon accès</a></p>
    <p style="font-size:12px;color:#718096;line-height:1.6;margin:0 0 16px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/><span style="color:#0099cc;">${url}</span></p>
  `)
  return { subject, html }
}

async function sendViaOutlook(to: string, subject: string, html: string) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const outlookKey = Deno.env.get('MICROSOFT_OUTLOOK_API_KEY')
  if (!lovableKey) throw new Error('LOVABLE_API_KEY missing')
  if (!outlookKey) throw new Error('MICROSOFT_OUTLOOK_API_KEY missing')

  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': outlookKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        from: { emailAddress: { address: FROM_ADDRESS } },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outlook sendMail failed [${res.status}]: ${text}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await req.json()
    const applicationId: string = body.application_id || body.applicationId
    if (!applicationId) {
      return new Response(JSON.stringify({ error: 'application_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: app, error: appErr } = await supabase
      .from('job_applications')
      .select('id, full_name, email, status, job_id, interview_message')
      .eq('id', applicationId)
      .maybeSingle()

    if (appErr || !app) {
      console.error('Application not found', { applicationId, appErr })
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: job } = await supabase
      .from('job_postings')
      .select('title, department')
      .eq('id', app.job_id)
      .maybeSingle()

    const jobTitle = job?.title || 'le poste'
    const status = app.status as 'nouvelle' | 'en_revue' | 'entretien' | 'acceptee' | 'refusee'

    if (status === 'nouvelle') {
      return new Response(JSON.stringify({ skipped: true, status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let activationUrl: string | undefined
    if (status === 'acceptee') {
      activationUrl = `${SITE_URL}/auth?welcome=1`
      try {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'invite',
          email: app.email,
          options: { redirectTo: `${SITE_URL}/auth?welcome=1` },
        })
        if (!linkErr && linkData?.properties?.action_link) {
          activationUrl = linkData.properties.action_link
        } else if (linkErr) {
          const { data: ml } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: app.email,
            options: { redirectTo: `${SITE_URL}/auth?welcome=1` },
          })
          if (ml?.properties?.action_link) activationUrl = ml.properties.action_link
        }
      } catch (e) {
        console.warn('generateLink failed, using fallback', e)
      }
    }

    const templateName = `application-${status.replace('_', '-')}`
    const { subject, html } = buildEmail(status as any, {
      candidateName: app.full_name,
      jobTitle,
      interviewMessage: app.interview_message || undefined,
      activationUrl,
    })

    try {
      await sendViaOutlook(app.email, subject, html)
    } catch (e) {
      console.error('Outlook send failed', e)
      await supabase.from('email_send_log').insert({
        recipient_email: app.email,
        template_name: templateName,
        status: 'failed',
        error_message: String(e),
        metadata: { provider: 'outlook', application_id: app.id, application_status: status, job_title: jobTitle },
      } as any)
      return new Response(JSON.stringify({ error: 'Email send failed', detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('email_send_log').insert({
      recipient_email: app.email,
      template_name: templateName,
      status: 'sent',
      metadata: { provider: 'outlook', application_id: app.id, application_status: status, job_title: jobTitle },
    } as any)

    console.log('Email sent via Outlook', { templateName, recipient: app.email })

    return new Response(JSON.stringify({ success: true, templateName, provider: 'outlook' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-application-status error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
