import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify admin
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

  const env = Deno.env.toObject()
  const has = (...keys: string[]) => keys.some((k) => !!env[k])

  const status = {
    stripe: has('STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'),
    microsoft: has('MICROSOFT_OUTLOOK_API_KEY', 'MICROSOFT_ONEDRIVE_API_KEY', 'AZURE_CLIENT_ID'),
    twilio: has('TWILIO_API_KEY', 'TWILIO_AUTH_TOKEN'),
    google_search_console: has('GOOGLE_SEARCH_CONSOLE_API_KEY'),
    lovable_ai: has('LOVABLE_API_KEY'),
    email_domain: true, // Lovable Emails infra is configured at the project level
  }

  return new Response(JSON.stringify({ status }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
