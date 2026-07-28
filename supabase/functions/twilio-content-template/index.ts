// Création + soumission à l'approbation WhatsApp d'un template Twilio Content.
// L'API Content (content.twilio.com) n'est pas exposée par la passerelle connecteur :
// on utilise donc les identifiants Twilio directs (Account SID + Auth Token ou API Key).
//
// Actions :
//  - { action: "create" }  -> crée le template facture puis demande l'approbation WhatsApp
//  - { action: "status" }  -> renvoie le statut d'approbation du template configuré
//  - { action: "list" }    -> liste les templates Content du compte

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CONTENT_API = 'https://content.twilio.com/v1'

const TEMPLATE_NAME = 'cloudmature_facture_notification'
// {{1}} nom du client · {{2}} type de document · {{3}} numéro · {{4}} montant · {{5}} lien
const TEMPLATE_BODY =
  'Bonjour {{1}}, votre {{2}} {{3}} d\u2019un montant de {{4}} est disponible. ' +
  'Vous pouvez la t\u00e9l\u00e9charger ici : {{5}} \u2014 CloudMature'

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseService) return json(500, { error: 'Backend configuration unavailable' })

  // --- AuthZ : admin uniquement
  const userToken = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!userToken) return json(401, { error: 'Unauthorized' })
  const admin = createClient(supabaseUrl, supabaseService)
  const { data: userRes } = await admin.auth.getUser(userToken)
  const userId = userRes?.user?.id
  if (!userId) return json(401, { error: 'Unauthorized' })
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' })
  if (!isAdmin) return json(403, { error: 'Forbidden' })

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authUser = Deno.env.get('TWILIO_API_KEY_SID') || accountSid
  const authPass = Deno.env.get('TWILIO_API_KEY_SECRET') || Deno.env.get('TWILIO_AUTH_TOKEN')
  if (!accountSid || !authUser || !authPass) {
    return json(200, {
      ok: false,
      reason: 'missing_credentials',
      error:
        "Identifiants Twilio directs manquants. Renseignez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN " +
        "(ou TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET) pour piloter l'API Content.",
    })
  }
  const basic = 'Basic ' + btoa(`${authUser}:${authPass}`)

  let payload: { action?: string; sid?: string }
  try { payload = await req.json() } catch { payload = {} }
  const action = payload.action ?? 'status'

  const api = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${CONTENT_API}${path}`, {
      ...init,
      headers: { Authorization: basic, ...(init.headers ?? {}) },
    })
    const text = await res.text()
    let body: unknown
    try { body = JSON.parse(text) } catch { body = text }
    return { ok: res.ok, status: res.status, body }
  }

  if (action === 'list') {
    const res = await api('/Content?PageSize=50')
    if (!res.ok) return json(res.status, { error: 'Twilio Content API error', details: res.body })
    return json(200, { ok: true, contents: res.body })
  }

  if (action === 'status') {
    const sid = payload.sid || Deno.env.get('TWILIO_INVOICE_TEMPLATE_SID')
    if (!sid) return json(200, { ok: false, reason: 'no_template', error: 'Aucun template configuré.' })
    const res = await api(`/Content/${sid}/ApprovalRequests`)
    if (!res.ok) return json(res.status, { error: 'Twilio Content API error', details: res.body })
    return json(200, { ok: true, sid, approval: res.body })
  }

  if (action === 'create') {
    const create = await api('/Content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        friendly_name: TEMPLATE_NAME,
        language: 'fr',
        variables: { '1': 'Client', '2': 'facture', '3': 'CM-F0001', '4': '1 000 000 GNF', '5': 'https://exemple.com/facture.pdf' },
        types: { 'twilio/text': { body: TEMPLATE_BODY } },
      }),
    })
    if (!create.ok) return json(create.status, { error: 'Création du template échouée', details: create.body })

    const sid = (create.body as { sid?: string })?.sid
    if (!sid) return json(500, { error: 'SID du template introuvable', details: create.body })

    const approval = await api(`/Content/${sid}/ApprovalRequests/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: TEMPLATE_NAME, category: 'UTILITY' }),
    })

    return json(200, {
      ok: approval.ok,
      sid,
      template_name: TEMPLATE_NAME,
      approval: approval.body,
      next_step: approval.ok
        ? `Template soumis à WhatsApp. Enregistrez ${sid} dans le secret TWILIO_INVOICE_TEMPLATE_SID.`
        : "La soumission à l'approbation a échoué — voir 'approval' pour le détail.",
    })
  }

  return json(400, { error: 'Action inconnue' })
})
