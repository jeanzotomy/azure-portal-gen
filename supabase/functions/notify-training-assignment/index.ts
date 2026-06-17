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

function buildEmail(opts: {
  recipientName: string
  trainingTitle: string
  trainingCategory?: string
  durationMinutes?: number
}) {
  const subject = `Nouvelle formation assignée : ${opts.trainingTitle}`
  const url = `${SITE_URL}/portal`
  const meta: string[] = []
  if (opts.trainingCategory) meta.push(escapeHtml(opts.trainingCategory))
  if (opts.durationMinutes) meta.push(`${opts.durationMinutes} min`)
  const metaLine = meta.length
    ? `<p style="font-size:13px;color:#64748b;margin:0 0 16px;">${meta.join(' • ')}</p>`
    : ''
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="background:#ffffff;font-family:'Inter',Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:0 auto;padding:20px 25px;">
    <img src="${LOGO_URL}" alt="${SITE_NAME}" width="48" height="48" style="margin:0 0 20px"/>
    <h1 style="font-size:22px;color:#161f2e;margin:0 0 20px;">Nouvelle formation à suivre 🎓</h1>
    <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Bonjour ${escapeHtml(opts.recipientName)},</p>
    <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 16px;">Une nouvelle formation vient de vous être assignée :</p>
    <div style="background:#f5fafd;border-left:4px solid #0099cc;padding:14px 18px;margin:0 0 16px;border-radius:6px;">
      <p style="font-size:16px;color:#161f2e;font-weight:700;margin:0 0 6px;">${escapeHtml(opts.trainingTitle)}</p>
      ${metaLine}
    </div>
    <p style="margin:24px 0;">
      <a href="${url}" style="background:#0099cc;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
        Accéder à ma formation
      </a>
    </p>
    <p style="font-size:12px;color:#718096;line-height:1.6;margin:0 0 16px;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
      <span style="color:#0099cc;">${url}</span>
    </p>
    <p style="font-size:13px;color:#0099cc;font-weight:600;margin:30px 0 0;">L'équipe ${SITE_NAME}</p>
  </div>
</body></html>`
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

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await req.json()
    const assignedId: string = body.assigned_id
    if (!assignedId) {
      return new Response(JSON.stringify({ error: 'assigned_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: assigned } = await supabase
      .from('onboarding_assigned_trainings')
      .select('id, training_id, process_id')
      .eq('id', assignedId)
      .maybeSingle()
    if (!assigned) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: proc } = await supabase
      .from('onboarding_processes')
      .select('user_id, candidate_email, candidate_name')
      .eq('id', assigned.process_id)
      .maybeSingle()

    const { data: training } = await supabase
      .from('trainings')
      .select('title, category, duration_minutes')
      .eq('id', assigned.training_id)
      .maybeSingle()

    if (!training) {
      return new Response(JSON.stringify({ error: 'Training not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let email: string | undefined = proc?.candidate_email || undefined
    let name: string = proc?.candidate_name || 'apprenant(e)'
    if (!email && proc?.user_id) {
      const { data: u } = await supabase.auth.admin.getUserById(proc.user_id)
      email = u?.user?.email || undefined
    }
    if (proc?.user_id) {
      const { data: pr } = await supabase
        .from('profiles').select('full_name').eq('user_id', proc.user_id).maybeSingle()
      if (pr?.full_name) name = pr.full_name
    }

    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no email' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, html } = buildEmail({
      recipientName: name,
      trainingTitle: training.title,
      trainingCategory: training.category || undefined,
      durationMinutes: training.duration_minutes || undefined,
    })

    try {
      await sendViaOutlook(email, subject, html)
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        template_name: 'training-assignment',
        status: 'sent',
        metadata: { provider: 'outlook', assigned_id: assignedId, training_id: assigned.training_id },
      } as any)
    } catch (e) {
      console.error('Outlook send failed', e)
      await supabase.from('email_send_log').insert({
        recipient_email: email,
        template_name: 'training-assignment',
        status: 'failed',
        error_message: String(e),
        metadata: { provider: 'outlook', assigned_id: assignedId, training_id: assigned.training_id },
      } as any)
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-training-assignment error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
