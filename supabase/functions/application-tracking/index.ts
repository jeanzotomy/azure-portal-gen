import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'CloudMature'
const FROM_ADDRESS = 'rh@cloudmature.com'
const OUTLOOK_GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_outlook'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function sendOtpEmail(to: string, code: string, trackingId: string) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const outlookKey = Deno.env.get('MICROSOFT_OUTLOOK_API_KEY')
  if (!lovableKey || !outlookKey) throw new Error('Email gateway keys missing')

  const subject = `Votre code de suivi de candidature — ${trackingId}`
  const html = `<!DOCTYPE html><html lang="fr"><body style="background:#fff;font-family:'Inter',Arial,sans-serif;margin:0;padding:0;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <img src="${LOGO_URL}" alt="${SITE_NAME}" width="48" height="48" style="margin:0 0 16px"/>
      <h1 style="font-size:20px;color:#161f2e;margin:0 0 12px;">Code de vérification</h1>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 18px;">Pour consulter le suivi de votre candidature <strong>${escapeHtml(trackingId)}</strong>, utilisez le code ci-dessous :</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#0099cc;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;text-align:center;padding:18px;margin:0 0 18px;">${code}</div>
      <p style="font-size:12px;color:#94a3b8;margin:0;">Ce code expire dans 5 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      <p style="font-size:13px;color:#0099cc;font-weight:600;margin:24px 0 0;">L'équipe ${SITE_NAME}</p>
    </div>
  </body></html>`

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
      saveToSentItems: false,
    }),
  })
  if (!res.ok) throw new Error(`Outlook send failed: ${res.status} ${await res.text()}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json()
    const action: string = body.action
    const trackingId: string = String(body.tracking_id || '').trim().toUpperCase()
    const email: string = String(body.email || '').trim().toLowerCase()

    if (!trackingId || !email) {
      return new Response(JSON.stringify({ error: 'tracking_id et email requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the application exists and matches the email
    const { data: app } = await supabase
      .from('job_applications')
      .select('id, email, full_name, status, created_at, updated_at, interview_message, job_id, tracking_id')
      .eq('tracking_id', trackingId)
      .maybeSingle()

    // Generic response to avoid leaking which trackingId/email exists
    const notFoundOk = !app || app.email.toLowerCase() !== email

    if (action === 'request_otp') {
      if (notFoundOk) {
        // Pretend success
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const code = String(Math.floor(100000 + Math.random() * 900000))
      await supabase.from('application_tracking_otp').insert({ email, code })
      try {
        await sendOtpEmail(email, code, trackingId)
      } catch (e) {
        console.error('OTP email send failed', e)
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify_otp') {
      const code: string = String(body.code || '').trim()
      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: 'Code invalide' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: otp } = await supabase
        .from('application_tracking_otp')
        .select('id, code, expires_at, used, attempts')
        .eq('email', email)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!otp || otp.code !== code) {
        if (otp) await supabase.from('application_tracking_otp').update({ attempts: (otp.attempts || 0) + 1 }).eq('id', otp.id)
        return new Response(JSON.stringify({ error: 'Code incorrect ou expiré' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      await supabase.from('application_tracking_otp').update({ used: true }).eq('id', otp.id)

      if (notFoundOk) {
        return new Response(JSON.stringify({ error: 'Candidature introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Fetch job title
      const { data: job } = await supabase
        .from('job_postings')
        .select('title, department, location')
        .eq('id', app.job_id)
        .maybeSingle()

      return new Response(JSON.stringify({
        application: {
          tracking_id: app.tracking_id,
          full_name: app.full_name,
          status: app.status,
          created_at: app.created_at,
          updated_at: app.updated_at,
          interview_message: app.interview_message,
          job_title: job?.title || null,
          job_department: job?.department || null,
          job_location: job?.location || null,
        },
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('application-tracking error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
