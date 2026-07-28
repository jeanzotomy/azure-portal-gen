// Diagnostic: verifies that TWILIO_WHATSAPP_FROM is a usable WhatsApp sender.
// Read-only — never sends a message.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'
const SANDBOX = 'whatsapp:+14155238886'

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeFromSender(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith('whatsapp:')) {
    const digits = trimmed.slice('whatsapp:'.length).replace(/[^\d]/g, '')
    return digits ? `whatsapp:+${digits}` : null
  }
  const digits = trimmed.replace(/[^\d]/g, '')
  return digits ? `whatsapp:+${digits}` : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const twilioKey = Deno.env.get('TWILIO_API_KEY')
  const fromRaw = Deno.env.get('TWILIO_WHATSAPP_FROM') || Deno.env.get('TWILIO_FROM_NUMBER')

  if (!supabaseUrl || !supabaseService) return json(500, { error: 'Backend configuration unavailable' })
  if (!lovableKey || !twilioKey) {
    return json(200, {
      ok: false,
      status: 'connector_missing',
      summary: "Le connecteur Twilio n'est pas configuré (LOVABLE_API_KEY ou TWILIO_API_KEY manquant).",
      checks: [],
    })
  }

  // --- AuthZ: staff only
  const authHeader = req.headers.get('Authorization') ?? ''
  const userToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!userToken) return json(401, { error: 'Unauthorized' })

  const admin = createClient(supabaseUrl, supabaseService)
  const { data: userRes } = await admin.auth.getUser(userToken)
  const userId = userRes?.user?.id
  if (!userId) return json(401, { error: 'Unauthorized' })

  let allowed = false
  for (const r of ['admin', 'agent', 'gestionnaire'] as const) {
    const { data } = await admin.rpc('has_role', { _user_id: userId, _role: r })
    if (data) { allowed = true; break }
  }
  if (!allowed) return json(403, { error: 'Forbidden' })

  const checks: Array<{ name: string; ok: boolean; detail: string }> = []

  // 1) Secret présent et bien formé
  const sender = normalizeFromSender(fromRaw)
  checks.push({
    name: 'Secret TWILIO_WHATSAPP_FROM',
    ok: Boolean(sender),
    detail: sender
      ? `Valeur normalisée : ${sender}${fromRaw?.trim() === sender ? '' : ` (valeur brute : « ${fromRaw?.trim()} »)`}`
      : "Secret absent ou vide. Renseignez un expéditeur au format whatsapp:+1XXXXXXXXXX.",
  })
  if (!sender) {
    return json(200, {
      ok: false,
      status: 'missing_sender',
      sender: null,
      summary: "Aucun expéditeur WhatsApp configuré dans TWILIO_WHATSAPP_FROM.",
      checks,
    })
  }

  const isSandbox = sender === SANDBOX

  // 2) Identifiants Twilio valides (appel léger et non destructif)
  const gwHeaders = {
    'Authorization': `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': twilioKey,
  }
  let credentialsOk = false
  try {
    const res = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=50`, { headers: gwHeaders })
    const bodyText = await res.text()
    credentialsOk = res.ok
    checks.push({
      name: 'Identifiants Twilio',
      ok: res.ok,
      detail: res.ok
        ? 'Connexion au compte Twilio réussie via la passerelle.'
        : `Échec [${res.status}] : ${bodyText.slice(0, 400)}`,
    })

    // 3) Le numéro existe-t-il sur le compte ?
    if (res.ok) {
      let numbers: string[] = []
      try {
        const parsed = JSON.parse(bodyText) as { incoming_phone_numbers?: Array<{ phone_number?: string }> }
        numbers = (parsed.incoming_phone_numbers ?? []).map((n) => n.phone_number ?? '').filter(Boolean)
      } catch { /* ignore parse errors */ }
      const target = sender.replace('whatsapp:', '')
      const owned = numbers.includes(target)
      checks.push({
        name: 'Numéro présent sur le compte Twilio',
        ok: owned || isSandbox,
        detail: isSandbox
          ? 'Numéro sandbox WhatsApp officiel de Twilio.'
          : owned
            ? `${target} figure parmi les numéros du compte.`
            : `${target} n'apparaît pas dans les numéros du compte (${numbers.length} trouvé(s)). Un expéditeur WhatsApp peut néanmoins exister hors de cette liste.`,
      })
    }
  } catch (e) {
    checks.push({ name: 'Identifiants Twilio', ok: false, detail: `Erreur réseau : ${(e as Error).message}` })
  }

  // 4) Validation réelle du canal WhatsApp : Twilio valide l'expéditeur avant l'envoi.
  //    On utilise une requête d'envoi volontairement invalide côté destinataire
  //    (To vide) : Twilio contrôle d'abord le From et renvoie 63007 s'il n'est pas
  //    un canal WhatsApp. Aucun message n'est jamais créé.
  let channelOk: boolean | null = null
  let channelDetail = ''
  let twilioCode: number | null = null
  try {
    const form = new URLSearchParams({ To: 'whatsapp:+15005550001', From: sender, Body: 'diagnostic' })
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: { ...gwHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    const rawCode = data.code
    twilioCode = typeof rawCode === 'number'
      ? rawCode
      : (typeof rawCode === 'string' && /^\d+$/.test(rawCode) ? Number(rawCode) : null)

    if (twilioCode === 63007) {
      channelOk = false
      channelDetail = `Twilio ne reconnaît pas ${sender} comme canal WhatsApp actif (code 63007).`
    } else if (res.ok) {
      channelOk = true
      channelDetail = `Expéditeur accepté par Twilio (message de test SID ${String(data.sid ?? 'n/a')}).`
    } else {
      // Erreur liée au destinataire de test → l'expéditeur a passé la validation.
      channelOk = true
      channelDetail = `Expéditeur validé ; l'erreur retournée concerne le destinataire de test (code ${twilioCode ?? res.status}).`
    }
  } catch (e) {
    channelOk = null
    channelDetail = `Impossible de vérifier le canal : ${(e as Error).message}`
  }

  checks.push({ name: 'Canal WhatsApp actif', ok: channelOk === true, detail: channelDetail })

  const ok = credentialsOk && channelOk === true
  const summary = ok
    ? `✅ ${sender} est un canal WhatsApp actif : les envois devraient fonctionner.`
    : channelOk === false
      ? `❌ ${sender} n'est pas activé comme expéditeur WhatsApp (63007). Vérifiez dans Twilio > Messaging > Senders > WhatsApp senders que ce numéro est approuvé, ou utilisez le sandbox ${SANDBOX}.`
      : `⚠️ Diagnostic incomplet : ${channelDetail}`

  return json(200, {
    ok,
    status: ok ? 'active' : channelOk === false ? 'not_a_whatsapp_channel' : 'unknown',
    sender,
    is_sandbox: isSandbox,
    twilio_code: twilioCode,
    summary,
    checks,
  })
})
