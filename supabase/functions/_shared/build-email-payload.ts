// Pure helper that builds the payload sent to the email queue.
// Extracted so it can be unit-tested without spinning up the edge function.

export const SITE_NAME = 'Communication Cloud Mature'
export const SENDER_DOMAIN = 'notify.cloudmature.com'
export const FROM_DOMAIN = 'cloudmature.com'
export const INFO_EMAIL = `info@${FROM_DOMAIN}`

export interface BuildEmailPayloadInput {
  messageId: string
  recipient: string
  subject: string
  html: string
  text: string
  templateName: string
  idempotencyKey: string
  unsubscribeToken: string
  queuedAt?: string
}

export interface EmailQueuePayload {
  message_id: string
  to: string
  from: string
  reply_to: string
  sender_domain: string
  subject: string
  html: string
  text: string
  purpose: 'transactional'
  label: string
  idempotency_key: string
  unsubscribe_token: string
  queued_at: string
}

export function buildEmailPayload(input: BuildEmailPayloadInput): EmailQueuePayload {
  return {
    message_id: input.messageId,
    to: input.recipient,
    from: `${SITE_NAME} <${INFO_EMAIL}>`,
    reply_to: INFO_EMAIL,
    sender_domain: SENDER_DOMAIN,
    subject: input.subject,
    html: input.html,
    text: input.text,
    purpose: 'transactional',
    label: input.templateName,
    idempotency_key: input.idempotencyKey,
    unsubscribe_token: input.unsubscribeToken,
    queued_at: input.queuedAt ?? new Date().toISOString(),
  }
}
