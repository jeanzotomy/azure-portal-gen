import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://cloudmature.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await req.json()
    const applicationId: string = body.application_id || body.applicationId
    if (!applicationId) {
      return new Response(JSON.stringify({ error: 'application_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch application + job
    const { data: app, error: appErr } = await supabase
      .from('job_applications')
      .select('id, full_name, email, status, job_id, interview_message')
      .eq('id', applicationId)
      .maybeSingle()

    if (appErr || !app) {
      console.error('Application not found', { applicationId, appErr })
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: job } = await supabase
      .from('job_postings')
      .select('title, department')
      .eq('id', app.job_id)
      .maybeSingle()

    const jobTitle = job?.title || 'le poste'
    const baseData = { candidateName: app.full_name, jobTitle }
    const status = app.status as 'nouvelle' | 'en_revue' | 'entretien' | 'acceptee' | 'refusee'

    let templateName: string | null = null
    let templateData: Record<string, any> = baseData

    switch (status) {
      case 'en_revue':
        templateName = 'application-en-revue'
        break
      case 'entretien':
        templateName = 'application-entretien'
        templateData = { ...baseData, interviewMessage: app.interview_message || '' }
        break
      case 'refusee':
        templateName = 'application-refusee'
        break
      case 'acceptee': {
        templateName = 'application-acceptee'
        // Generate magic link via admin API (invite type creates user if needed)
        let activationUrl = `${SITE_URL}/auth?welcome=1`
        try {
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
            type: 'invite',
            email: app.email,
            options: { redirectTo: `${SITE_URL}/auth?welcome=1` },
          })
          if (!linkErr && linkData?.properties?.action_link) {
            activationUrl = linkData.properties.action_link
          } else if (linkErr) {
            // User might already exist — try magiclink instead
            const { data: ml } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: app.email,
              options: { redirectTo: `${SITE_URL}/auth?welcome=1` },
            })
            if (ml?.properties?.action_link) activationUrl = ml.properties.action_link
          }
        } catch (e) {
          console.warn('generateLink failed, using fallback', e)
        }
        templateData = { ...baseData, activationUrl }
        break
      }
      default:
        // 'nouvelle' or anything else: no email
        return new Response(JSON.stringify({ skipped: true, status }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Invoke send-transactional-email
    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey,
      },
      body: JSON.stringify({
        templateName,
        recipientEmail: app.email,
        idempotencyKey: `app-status-${app.id}-${status}`,
        templateData,
      }),
    })

    const sendBody = await sendRes.text()
    if (!sendRes.ok) {
      console.error('send-transactional-email failed', { status: sendRes.status, body: sendBody })
      return new Response(JSON.stringify({ error: 'Email send failed', detail: sendBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, templateName }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-application-status error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
