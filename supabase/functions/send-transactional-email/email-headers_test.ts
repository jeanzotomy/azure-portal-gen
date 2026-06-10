import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  buildEmailPayload,
  INFO_EMAIL,
  SITE_NAME,
} from '../_shared/build-email-payload.ts'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const EXPECTED_FROM = `${SITE_NAME} <${INFO_EMAIL}>`
const EXPECTED_REPLY_TO = 'info@cloudmature.com'

const sample = (templateName: string) =>
  buildEmailPayload({
    messageId: 'msg-123',
    recipient: 'user@example.com',
    subject: 'Test',
    html: '<p>x</p>',
    text: 'x',
    templateName,
    idempotencyKey: 'idem-1',
    unsubscribeToken: 'tok-1',
    queuedAt: '2026-01-01T00:00:00Z',
  })

Deno.test('INFO_EMAIL constant is info@cloudmature.com', () => {
  assertEquals(INFO_EMAIL, EXPECTED_REPLY_TO)
})

Deno.test('payload From header is info@cloudmature.com', () => {
  const p = sample('direct-message')
  assertEquals(p.from, EXPECTED_FROM)
  assertMatch(p.from, /<info@cloudmature\.com>/)
})

Deno.test('payload Reply-To header is info@cloudmature.com', () => {
  const p = sample('direct-message')
  assertEquals(p.reply_to, EXPECTED_REPLY_TO)
})

Deno.test('From and Reply-To are identical for every registered template', () => {
  const names = Object.keys(TEMPLATES)
  if (names.length === 0) throw new Error('No templates registered')
  for (const name of names) {
    const p = sample(name)
    assertEquals(
      p.from,
      EXPECTED_FROM,
      `Template "${name}" must send From: ${EXPECTED_FROM}`,
    )
    assertEquals(
      p.reply_to,
      EXPECTED_REPLY_TO,
      `Template "${name}" must use Reply-To: ${EXPECTED_REPLY_TO}`,
    )
  }
})

Deno.test('payload never uses noreply@ sender', () => {
  const p = sample('direct-message')
  if (p.from.includes('noreply@')) {
    throw new Error(`From header must not contain noreply@: ${p.from}`)
  }
  if (p.reply_to.includes('noreply@')) {
    throw new Error(`Reply-To header must not contain noreply@: ${p.reply_to}`)
  }
})
