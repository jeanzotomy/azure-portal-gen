// Calls made by database triggers carry an `x-internal-secret` header whose value
// lives only in the database (private schema). Verified with the service role.
import { createClient } from 'npm:@supabase/supabase-js@2'

export async function isInternalCall(req: Request): Promise<boolean> {
  const secret = req.headers.get('x-internal-secret') || ''
  if (secret.length < 20) return false
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await admin.rpc('check_internal_secret', { _secret: secret })
  return !error && data === true
}
