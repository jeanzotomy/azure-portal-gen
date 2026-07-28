// Send a WhatsApp message via Twilio (admin/agent/gestionnaire only).
// Uses the Lovable Twilio connector gateway — no Twilio creds in code.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeE164(input: string): string | null {
  const digits = (input || '').replace(/[^\d]/g, '')
  if (digits.length < 6 || digits.length > 15) return null
  return digits
}

function normalizeFromSender(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith('whatsapp:')) return trimmed
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return null
  return `whatsapp:+${digits}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const twilioKey = Deno.env.get('TWILIO_API_KEY')
  const fromRaw = Deno.env.get('TWILIO_WHATSAPP_FROM') || Deno.env.get('TWILIO_FROM_NUMBER')

  if (!lovableKey || !twilioKey) {
    return json(500, { error: 'Twilio connector not configured' })
  }
  const fromSender = normalizeFromSender(fromRaw)
  if (!fromSender) {
    return json(500, { error: 'TWILIO_WHATSAPP_FROM (or TWILIO_FROM_NUMBER) not configured' })
  }

  // --- AuthZ: admin / agent / gestionnaire only
  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!userToken) return json(401, { error: 'Unauthorized' })

  const admin = createClient(supabaseUrl, supabaseService)
  const { data: userRes } = await admin.auth.getUser(userToken)
  const userId = userRes?.user?.id
  if (!userId) return json(401, { error: 'Unauthorized' })

  const roles: Array<'admin' | 'agent' | 'gestionnaire' | 'comptable' | 'hr'> = ['admin', 'agent', 'gestionnaire', 'comptable', 'hr']
  let allowed = false
  for (const r of roles) {
    const { data } = await admin.rpc('has_role', { _user_id: userId, _role: r })
    if (data) { allowed = true; break }
  }
  if (!allowed) return json(403, { error: 'Forbidden' })

  // --- Body validation
  let payload: { to_e164?: string; body?: string; ticket_id?: string | null }
  try { payload = await req.json() } catch { return json(400, { error: 'Invalid JSON' }) }

  const to = normalizeE164(payload.to_e164 || '')
  const body = (payload.body || '').trim()
  if (!to) return json(400, { error: 'Numéro destinataire invalide (format E.164 attendu).' })
  if (!body || body.length > 1500) {
    return json(400, { error: 'Message vide ou trop long (1500 caractères max).' })
  }
  const ticketId = typeof payload.ticket_id === 'string' && payload.ticket_id ? payload.ticket_id : null

  // --- Twilio send via gateway
  const form = new URLSearchParams({
    To: `whatsapp:+${to}`,
    From: fromSender,
    Body: body,
  })

  const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': twilioKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const twilioData = await twilioRes.json().catch(() => ({}))
  if (!twilioRes.ok) {
    let msg = (twilioData && (twilioData.message || twilioData.error)) || `Twilio error ${twilioRes.status}`
    if (twilioData?.code === 63007) {
      msg =
        `Le numéro expéditeur WhatsApp (${fromSender}) n'est pas activé comme canal WhatsApp sur ce compte Twilio. ` +
        `Configurez un expéditeur WhatsApp approuvé (ou le sandbox whatsapp:+14155238886) et renseignez-le dans TWILIO_WHATSAPP_FROM.`
    }
    console.error('Twilio WhatsApp send failed', twilioRes.status, twilioData)
    return json(502, { error: msg, twilio_code: twilioData?.code ?? null })
  }

  // --- Persist as ticket reply if linked
  if (ticketId) {
    const { error: replyErr } = await admin.from('ticket_replies').insert({
      ticket_id: ticketId,
      user_id: userId,
      is_admin: true,
      message: `📱 WhatsApp → +${to}\n\n${body}`,
    })
    if (replyErr) console.warn('ticket_replies insert failed', replyErr.message)
  }

  return json(200, {
    ok: true,
    sid: twilioData?.sid ?? null,
    status: twilioData?.status ?? null,
    to: `+${to}`,
  })
})
