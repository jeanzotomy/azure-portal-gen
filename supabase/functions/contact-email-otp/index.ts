// Contact form email verification.
// Actions:
//  - "send":   generate a 6-digit code, store hash, send email via send-transactional-email
//  - "verify": validate the code → mint a short-lived verification token
//  - "submit": validate token + write to contact_requests
//
// Public function (verify_jwt = false). Includes basic rate limiting per email.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CODE_TTL_MIN = 10
const TOKEN_TTL_MIN = 20
const MAX_ATTEMPTS = 5
const SEND_COOLDOWN_SEC = 45 // min delay between two code requests for same email

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isEmail(s: unknown): s is string {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 255
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleSend(email: string, ip: string) {
  const normalized = email.trim().toLowerCase()

  // Cooldown: latest row for this email
  const { data: last } = await admin
    .from('contact_email_otps')
    .select('created_at')
    .eq('email', normalized)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (last?.created_at) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000
    if (elapsed < SEND_COOLDOWN_SEC) {
      return jsonResp({ error: 'cooldown', retryAfter: Math.ceil(SEND_COOLDOWN_SEC - elapsed) }, 429)
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const code_hash = await sha256(`${normalized}:${code}`)
  const expires_at = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString()

  const { error: insErr } = await admin.from('contact_email_otps').insert({
    email: normalized,
    code_hash,
    expires_at,
    ip_address: ip || null,
  })
  if (insErr) {
    console.error('contact-email-otp insert error', insErr)
    return jsonResp({ error: 'storage_error' }, 500)
  }

  // Send the verification email through the existing transactional pipeline.
  const { error: mailErr } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'contact-otp',
      recipientEmail: normalized,
      idempotencyKey: `contact-otp-${normalized}-${Date.now()}`,
      templateData: { code, expiresInMinutes: CODE_TTL_MIN },
    },
  })
  if (mailErr) {
    console.error('contact-email-otp mail error', mailErr)
    return jsonResp({ error: 'mail_send_failed' }, 500)
  }

  return jsonResp({ ok: true, expiresInMinutes: CODE_TTL_MIN })
}

async function handleVerify(email: string, code: string) {
  const normalized = email.trim().toLowerCase()
  if (!/^\d{6}$/.test(code)) return jsonResp({ error: 'invalid_code_format' }, 400)

  const { data: row, error } = await admin
    .from('contact_email_otps')
    .select('*')
    .eq('email', normalized)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !row) return jsonResp({ error: 'no_active_code' }, 400)
  if (new Date(row.expires_at).getTime() < Date.now()) return jsonResp({ error: 'expired' }, 400)
  if (row.attempts >= MAX_ATTEMPTS) return jsonResp({ error: 'too_many_attempts' }, 429)

  const expected = await sha256(`${normalized}:${code}`)
  if (expected !== row.code_hash) {
    await admin.from('contact_email_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id)
    return jsonResp({ error: 'invalid_code', remaining: Math.max(0, MAX_ATTEMPTS - row.attempts - 1) }, 400)
  }

  const token = crypto.randomUUID() + '-' + crypto.randomUUID().slice(0, 8)
  const token_expires_at = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString()
  await admin
    .from('contact_email_otps')
    .update({ verified_at: new Date().toISOString(), verification_token: token, token_expires_at })
    .eq('id', row.id)

  return jsonResp({ ok: true, verificationToken: token, expiresInMinutes: TOKEN_TTL_MIN })
}

async function handleSubmit(payload: {
  email: string
  verificationToken: string
  name: string
  company: string
  message: string
}) {
  const normalized = payload.email.trim().toLowerCase()
  const name = (payload.name || '').trim().slice(0, 100)
  const company = (payload.company || '').trim().slice(0, 150)
  const message = (payload.message || '').trim().slice(0, 2000)
  if (!name || !company || !message) return jsonResp({ error: 'missing_fields' }, 400)
  if (!payload.verificationToken) return jsonResp({ error: 'missing_token' }, 400)

  const { data: row } = await admin
    .from('contact_email_otps')
    .select('id, email, token_expires_at, token_consumed_at')
    .eq('verification_token', payload.verificationToken)
    .maybeSingle()
  if (!row) return jsonResp({ error: 'invalid_token' }, 400)
  if (row.email !== normalized) return jsonResp({ error: 'email_mismatch' }, 400)
  if (row.token_consumed_at) return jsonResp({ error: 'token_already_used' }, 400)
  if (!row.token_expires_at || new Date(row.token_expires_at).getTime() < Date.now()) {
    return jsonResp({ error: 'token_expired' }, 400)
  }

  const { error: insErr } = await admin.from('contact_requests').insert({
    name, email: normalized, company, message,
  })
  if (insErr) {
    console.error('contact submit insert error', insErr)
    return jsonResp({ error: 'storage_error' }, 500)
  }

  await admin
    .from('contact_email_otps')
    .update({ token_consumed_at: new Date().toISOString() })
    .eq('id', row.id)

  return jsonResp({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResp({ error: 'method_not_allowed' }, 405)

  let body: any
  try { body = await req.json() } catch { return jsonResp({ error: 'invalid_json' }, 400) }
  const action = String(body?.action || '')
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''

  try {
    if (action === 'send') {
      if (!isEmail(body.email)) return jsonResp({ error: 'invalid_email' }, 400)
      return await handleSend(body.email, ip)
    }
    if (action === 'verify') {
      if (!isEmail(body.email)) return jsonResp({ error: 'invalid_email' }, 400)
      return await handleVerify(body.email, String(body.code || ''))
    }
    if (action === 'submit') {
      if (!isEmail(body.email)) return jsonResp({ error: 'invalid_email' }, 400)
      return await handleSubmit(body)
    }
    return jsonResp({ error: 'unknown_action' }, 400)
  } catch (e) {
    console.error('contact-email-otp error', (e as Error).message)
    return jsonResp({ error: 'server_error' }, 500)
  }
})
