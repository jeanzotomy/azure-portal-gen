import { createClient } from 'npm:@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://cloudmature.com'
const FROM_ADDRESS = 'rh@cloudmature.com'
const OUTLOOK_GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_outlook'

async function sendViaOutlook(to: string, subject: string, html: string) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const outlookKey = Deno.env.get('MICROSOFT_OUTLOOK_API_KEY')
  if (!lovableKey) throw new Error('LOVABLE_API_KEY missing')
  if (!outlookKey) throw new Error('MICROSOFT_OUTLOOK_API_KEY missing')

  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': outlookKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        from: { emailAddress: { address: FROM_ADDRESS } },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outlook sendMail failed [${res.status}]: ${text}`)
  }
}

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
        return new Response(JSON.stringify({ skipped: true, status }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const entry = TEMPLATES[templateName]
    if (!entry) {
      return new Response(JSON.stringify({ error: `Template ${templateName} not found` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = typeof entry.subject === 'function' ? entry.subject(templateData) : entry.subject
    const html = await render(React.createElement(entry.component, templateData))

    try {
      await sendViaOutlook(app.email, subject, html)
    } catch (e) {
      console.error('Outlook send failed', e)
      // Log failure
      await supabase.from('email_send_log').insert({
        recipient_email: app.email,
        template_name: templateName,
        status: 'failed',
        error_message: String(e),
        metadata: { provider: 'outlook', application_id: app.id, status },
      })
      return new Response(JSON.stringify({ error: 'Email send failed', detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('email_send_log').insert({
      recipient_email: app.email,
      template_name: templateName,
      status: 'sent',
      metadata: { provider: 'outlook', application_id: app.id, status },
    })

    console.log('Email sent via Outlook', { templateName, recipient: app.email })

    return new Response(JSON.stringify({ success: true, templateName, provider: 'outlook' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-application-status error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
