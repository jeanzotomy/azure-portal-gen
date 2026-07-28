// Send a WhatsApp message via Twilio (authorized staff only).
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

function extractTwilioCode(payload: Record<string, unknown>): number | null {
  const rawCode = payload.code
  if (typeof rawCode === 'number') return rawCode
  if (typeof rawCode === 'string' && /^\d+$/.test(rawCode)) return Number(rawCode)
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const twilioKey = Deno.env.get('TWILIO_API_KEY')
  const fromRaw = Deno.env.get('TWILIO_WHATSAPP_FROM') || Deno.env.get('TWILIO_FROM_NUMBER')

  if (!supabaseUrl || !supabaseService) {
    return json(500, { error: 'Backend configuration unavailable' })
  }
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
  let payload: {
    to_e164?: string
    body?: string
    ticket_id?: string | null
    template?: string | null
    content_sid?: string | null
    content_variables?: Record<string, string> | null
  }
  try { payload = await req.json() } catch { return json(400, { error: 'Invalid JSON' }) }

  const to = normalizeE164(payload.to_e164 || '')
  const body = (payload.body || '').trim()
  if (!to) return json(400, { error: 'Numéro destinataire invalide (format E.164 attendu).' })
  if (!body || body.length > 1500) {
    return json(400, { error: 'Message vide ou trop long (1500 caractères max).' })
  }
  const ticketId = typeof payload.ticket_id === 'string' && payload.ticket_id ? payload.ticket_id : null

  // --- Template approuvé (obligatoire hors fenêtre 24 h)
  const templateSidFromEnv =
    payload.template === 'invoice' ? (Deno.env.get('TWILIO_INVOICE_TEMPLATE_SID') || '').trim() : ''
  const contentSid = (payload.content_sid || '').trim() || templateSidFromEnv || null
  const contentVariables =
    payload.content_variables && typeof payload.content_variables === 'object'
      ? payload.content_variables
      : null

  // --- Twilio send via gateway
  const form = new URLSearchParams({
    To: `whatsapp:+${to}`,
    From: fromSender,
  })
  if (contentSid) {
    form.set('ContentSid', contentSid)
    if (contentVariables) form.set('ContentVariables', JSON.stringify(contentVariables))
  } else {
    form.set('Body', body)
  }

  const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': twilioKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const twilioData = await twilioRes.json().catch(() => ({})) as Record<string, unknown>
  if (!twilioRes.ok) {
    const twilioCode = extractTwilioCode(twilioData)
    let msg = (twilioData && (twilioData.message || twilioData.error)) || `Twilio error ${twilioRes.status}`
    if (twilioCode === 63007) {
      msg =
        `Le numéro expéditeur WhatsApp (${fromSender}) n'est pas activé comme canal WhatsApp sur ce compte Twilio. ` +
        `Configurez un expéditeur WhatsApp approuvé (ou le sandbox whatsapp:+14155238886) et renseignez-le dans TWILIO_WHATSAPP_FROM.`
    }
    console.error('Twilio WhatsApp send failed', twilioRes.status, twilioData)
    if (twilioCode === 63007) {
      return json(200, {
        ok: false,
        error: msg,
        twilio_code: twilioCode,
        reason: 'sender_not_whatsapp_channel',
        fallback: 'manual_whatsapp_link',
      })
    }
    return json(502, { error: msg, twilio_code: twilioCode })
  }

  // --- Vérification de la livraison réelle : Twilio accepte (queued) puis peut
  //     échouer, notamment 63016 (message libre hors fenêtre 24h : un template
  //     approuvé est requis). On interroge le statut avant de déclarer un succès.
  const sid = typeof twilioData?.sid === 'string' ? twilioData.sid : null
  let finalStatus = typeof twilioData?.status === 'string' ? twilioData.status : null
  let deliveryError: number | null = null

  if (sid) {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1200))
      const check = await fetch(`${GATEWAY_URL}/Messages/${sid}.json`, {
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': twilioKey,
        },
      })
      if (!check.ok) break
      const info = await check.json().catch(() => ({})) as Record<string, unknown>
      finalStatus = typeof info.status === 'string' ? info.status : finalStatus
      const code = info.error_code
      if (typeof code === 'number') deliveryError = code
      if (deliveryError || ['delivered', 'read', 'sent', 'failed', 'undelivered'].includes(String(finalStatus))) break
    }
  }

  if (deliveryError || finalStatus === 'undelivered' || finalStatus === 'failed') {
    const msg = deliveryError === 63016
      ? `WhatsApp a refusé le message libre : le destinataire (+${to}) ne vous a pas écrit dans les dernières 24 h. ` +
        `Hors de cette fenêtre, Twilio n'autorise que les modèles (templates) WhatsApp approuvés. ` +
        `Utilisez un template approuvé ou envoyez le message manuellement.`
      : `Le message n'a pas été livré (statut ${finalStatus}${deliveryError ? `, code ${deliveryError}` : ''}).`
    console.error('WhatsApp delivery failed', { sid, finalStatus, deliveryError })
    return json(200, {
      ok: false,
      error: msg,
      twilio_code: deliveryError,
      status: finalStatus,
      reason: deliveryError === 63016 ? 'outside_24h_window' : 'not_delivered',
      fallback: 'manual_whatsapp_link',
    })
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
    sid,
    status: finalStatus,
    to: `+${to}`,
  })
})

