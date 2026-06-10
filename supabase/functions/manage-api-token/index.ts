import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): { value: string; prefix: string } {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  const value = `cm_${hex}`
  return { value, prefix: value.slice(0, 11) }
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseService)
  const { data: userRes } = await supabase.auth.getUser(token)
  const userId = userRes?.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try { body = await req.json() } catch { body = {} }
  const action = (body?.action ?? 'list') as 'list' | 'create' | 'revoke'

  if (action === 'list') {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, name, token_prefix, scopes, created_at, last_used_at, expires_at, revoked_at')
      .order('created_at', { ascending: false })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ tokens: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'create') {
    const name = (body?.name ?? '').toString().trim()
    if (!name || name.length > 80) {
      return new Response(JSON.stringify({ error: 'Nom invalide (1–80 caractères)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const scopes = Array.isArray(body?.scopes) ? body.scopes.slice(0, 10).map((s: any) => String(s).slice(0, 40)) : []
    const expiresAt = body?.expires_at ? new Date(body.expires_at).toISOString() : null

    const { value, prefix } = generateToken()
    const hash = await sha256(value)

    const { data, error } = await supabase
      .from('api_tokens')
      .insert({
        name, token_prefix: prefix, token_hash: hash, scopes,
        created_by: userId, expires_at: expiresAt,
      })
      .select('id, name, token_prefix, scopes, created_at, expires_at')
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return the plaintext value ONCE
    return new Response(JSON.stringify({ token: data, value }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'revoke') {
    const id = body?.id
    if (!id) {
      return new Response(JSON.stringify({ error: 'id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { error } = await supabase
      .from('api_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'action inconnue' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
