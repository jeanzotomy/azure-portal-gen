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
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildHtml(name: string, jobTitle: string, inviteUrl: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="background:#fff;font-family:Inter,Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:20px 25px;">
  <img src="${LOGO_URL}" alt="${SITE_NAME}" width="48" height="48" style="margin:0 0 20px"/>
  <div style="background:linear-gradient(135deg,#0099cc,#007aa3);color:#fff;border-radius:14px;padding:26px;margin:0 0 20px;">
    <p style="font-size:13px;opacity:.9;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Bienvenue chez ${SITE_NAME}</p>
    <h1 style="font-size:24px;margin:0;font-weight:700;">Félicitations ${escapeHtml(name)} 🎉</h1>
  </div>
  <p style="font-size:15px;color:#1e293b;line-height:1.6;margin:0 0 14px;">
    Nous sommes ravis de vous accueillir pour le poste de <strong>${escapeHtml(jobTitle)}</strong>.
    Votre <strong>portail Onboarding</strong> est désormais ouvert : il vous guide pas à pas pour finaliser votre intégration.
  </p>
  <ul style="font-size:14px;color:#334155;line-height:1.8;padding-left:18px;margin:0 0 18px;">
    <li>📝 Signature électronique de votre contrat</li>
    <li>📂 Téléversement sécurisé de vos documents (CNI, RIB, diplômes…)</li>
    <li>🎓 Modules de formation et quiz d'intégration</li>
    <li>💻 Création de votre compte SI et accès aux outils</li>
    <li>👥 Rencontre avec votre future équipe</li>
  </ul>
  <div style="text-align:center;margin:24px 0;">
    <a href="${inviteUrl}" style="background:#0099cc;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Accéder à mon onboarding</a>
  </div>
  <p style="font-size:12px;color:#64748b;margin:20px 0 0;">
    Si le bouton ne fonctionne pas, copiez ce lien : <br/>
    <a href="${inviteUrl}" style="color:#0099cc;word-break:break-all;">${inviteUrl}</a>
  </p>
  <p style="font-size:13px;color:#0099cc;font-weight:600;margin:30px 0 0;">L'équipe ${SITE_NAME}</p>
</div></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { process_id, application_id } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: proc, error } = await supabase
      .from('onboarding_processes')
      .select('*, job_postings:job_id(title)')
      .eq(process_id ? 'id' : 'application_id', process_id || application_id)
      .maybeSingle()
    if (error || !proc) throw new Error(error?.message || 'Process introuvable')

    const jobTitle = (proc as any).job_postings?.title || 'votre poste'
    const inviteUrl = `${SITE_URL}/onboarding?email=${encodeURIComponent(proc.candidate_email)}`
    const subject = `🎉 Bienvenue chez ${SITE_NAME} – Démarrez votre onboarding`
    const html = buildHtml(proc.candidate_name, jobTitle, inviteUrl)

    const apiKey = Deno.env.get('MICROSOFT_OUTLOOK_API_KEY')
    if (apiKey) {
      const r = await fetch(`${OUTLOOK_GATEWAY}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [proc.candidate_email],
          subject,
          html,
        }),
      })
      if (!r.ok) console.error('Outlook send failed', await r.text())
    }

    await supabase.from('email_send_log').insert({
      recipient_email: proc.candidate_email,
      template_name: 'onboarding_invite',
      status: 'sent',
      metadata: { process_id: proc.id },
    })

    return new Response(JSON.stringify({ success: true, invite_url: inviteUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
