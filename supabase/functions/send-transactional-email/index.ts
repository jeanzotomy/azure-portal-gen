import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import {
  buildEmailPayload,
  SITE_NAME,
  SENDER_DOMAIN,
  FROM_DOMAIN,
} from '../_shared/build-email-payload.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Auth note: this function uses verify_jwt = true in config.toml, so Supabase's
// gateway validates the caller's JWT (anon or service_role) before the request
// reaches this code. No in-function auth check is needed.

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Parse request body
  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let messageId: string
  let templateData: Record<string, any> = {}
  let proposalRequest: Record<string, any> = {}
  try {
    const body = await req.json()
    proposalRequest = body
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 1. Look up template from registry (early - needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Resolve effective recipient: template-level `to` takes precedence over
  // the caller-provided recipientEmail. This allows notification templates
  // to always send to a fixed address (e.g., site owner from env var).
  let effectiveRecipient = template.to || recipientEmail

  // This template is a single requested proposal, never a campaign or anonymous send.
  if (templateName === 'proposal-delivery') {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: auth, error: authError } = await admin.auth.getUser(token)
    if (authError || !auth.user) return new Response(JSON.stringify({ error: 'Connexion requise' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: roles, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', auth.user.id)
    if (roleError || !roles?.some((r) => ['admin', 'gestionnaire', 'agent', 'commercial'].includes(r.role))) return new Response(JSON.stringify({ error: 'Accès interdit' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (proposalRequest.expectedByClient !== true) return new Response(JSON.stringify({ error: 'La proposition doit être attendue par le client' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: proposal, error: proposalError } = await admin.from('commercial_proposals').select('id, title, client_name, client_email').eq('id', proposalRequest.proposalId).maybeSingle()
    if (proposalError || !proposal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proposal.client_email || '')) return new Response(JSON.stringify({ error: 'Proposition ou adresse client invalide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const files = proposalRequest.documents
    if (!Array.isArray(files) || files.length !== 2 || new Set(files.map((f) => f.extension)).size !== 2) return new Response(JSON.stringify({ error: 'PDF et Word requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const links: Record<string, string> = {}
    for (const file of files) {
      if (!['pdf', 'docx'].includes(file.extension) || typeof file.base64 !== 'string' || file.base64.length > 7000000) return new Response(JSON.stringify({ error: 'Document invalide ou trop volumineux' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      let bytes: Uint8Array
      try { bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0)) } catch { return new Response(JSON.stringify({ error: 'Document invalide' }), { status: 400, headers: corsHeaders }) }
      const valid = file.extension === 'pdf' ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' : bytes[0] === 80 && bytes[1] === 75
      if (!valid || bytes.length > 5 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Format de document invalide' }), { status: 400, headers: corsHeaders })
      const path = `${proposal.id}/${crypto.randomUUID()}/proposition.${file.extension}`
      const { error: uploadError } = await admin.storage.from('proposal-documents').upload(path, bytes, { contentType: file.extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (uploadError) return new Response(JSON.stringify({ error: 'Stockage des documents impossible' }), { status: 500, headers: corsHeaders })
      const { data: link, error: linkError } = await admin.storage.from('proposal-documents').createSignedUrl(path, 7 * 24 * 3600)
      if (linkError || !link) return new Response(JSON.stringify({ error: 'Lien de téléchargement indisponible' }), { status: 500, headers: corsHeaders })
      links[file.extension] = link.signedUrl
    }
    effectiveRecipient = proposal.client_email
    templateData = { title: proposal.title, clientName: proposal.client_name, message: typeof proposalRequest.message === 'string' ? proposalRequest.message.slice(0, 3000) : '', pdfUrl: links.pdf, wordUrl: links.docx }
    idempotencyKey = `proposal-delivery:${proposal.id}:${String(proposalRequest.idempotencyKey || messageId).slice(0, 100)}`
  }

  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed - refusing to send', {
      error: suppressionError,
      effectiveRecipient,
    })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', { effectiveRecipient, templateName })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      error: tokenLookupError,
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token - upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        error: tokenError,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        error: reReadError,
        email: normalizedEmail,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used - email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Render React Email template to HTML and plain text
  const html = await renderAsync(
    React.createElement(template.component, templateData)
  )
  const plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true }
  )

  // Resolve subject - supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 5. Enqueue the pre-rendered email for async processing by the dispatcher.
  // The dispatcher (process-email-queue) handles sending, retries, and rate-limit backoff.

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  // All emails are sent from and reply to info@cloudmature.com (centralized in build-email-payload.ts)
  const payload = buildEmailPayload({
    messageId,
    recipient: effectiveRecipient,
    subject: resolvedSubject,
    html,
    text: plainText,
    templateName,
    idempotencyKey,
    unsubscribeToken,
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload,
  })

  if (enqueueError) {
    console.error('Failed to enqueue email', {
      error: enqueueError,
      templateName,
      effectiveRecipient,
    })

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })

    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Transactional email enqueued', { templateName, effectiveRecipient })

  return new Response(
    JSON.stringify({ success: true, queued: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
