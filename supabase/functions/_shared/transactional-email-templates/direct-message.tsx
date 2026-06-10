/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Attachment {
  name?: string
  url?: string
  size?: number
  contentType?: string
}

interface Props {
  recipientName?: string
  senderName?: string
  senderRole?: string
  messageSubject?: string
  messageBody?: string
  attachments?: Attachment[]
  attachmentsExpireAt?: string
}

const formatSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

const Email = ({
  recipientName,
  senderName,
  senderRole,
  messageSubject,
  messageBody,
  attachments,
  attachmentsExpireAt,
}: Props) => {
  const paragraphs = (messageBody || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const validAttachments = (attachments || []).filter((a) => a && a.url && a.name)
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{messageSubject || `Message de ${senderName || SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
          <Heading style={h1}>{messageSubject || 'Vous avez un nouveau message'}</Heading>
          <Text style={text}>Bonjour {recipientName || ''},</Text>
          <Section style={card}>
            {paragraphs.length > 0
              ? paragraphs.map((p, i) => (
                  <Text key={i} style={body}>{p}</Text>
                ))
              : <Text style={body}>{messageBody || ''}</Text>}
          </Section>

          {validAttachments.length > 0 && (
            <Section style={attachSection}>
              <Text style={attachTitle}>
                📎 Pièce{validAttachments.length > 1 ? 's' : ''} jointe{validAttachments.length > 1 ? 's' : ''} ({validAttachments.length})
              </Text>
              {validAttachments.map((a, i) => (
                <Section key={i} style={attachItem}>
                  <Text style={attachName}>
                    {a.name}
                    {a.size ? <span style={attachMeta}> · {formatSize(a.size)}</span> : null}
                  </Text>
                  <Button href={a.url} style={attachBtn}>Télécharger</Button>
                </Section>
              ))}
              {attachmentsExpireAt && (
                <Text style={attachExpire}>
                  Les liens de téléchargement expirent le{' '}
                  {new Date(attachmentsExpireAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}.
                </Text>
              )}
            </Section>
          )}

          <Hr style={hr} />
          <Text style={small}>
            Ce message vous a été adressé directement par {senderName || 'l\'équipe CloudMature'}
            {senderRole ? ` (${senderRole})` : ''}. Vous pouvez répondre à cet email — la réponse sera transmise à l'expéditeur.
          </Text>
          <Text style={footer}>L'équipe {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d.messageSubject || `Message de ${d.senderName || 'CloudMature'}`,
  displayName: 'Message direct (RH / Admin)',
  previewData: {
    recipientName: 'Mamadou Diallo',
    senderName: 'Aïssatou Bah',
    senderRole: 'Responsable RH',
    messageSubject: 'Rappel — formation sécurité à finaliser',
    messageBody: "Bonjour,\n\nMerci de bien vouloir compléter la formation \"Sécurité de l'information\" avant vendredi.\n\nN'hésitez pas à revenir vers moi si vous avez la moindre question.",
    attachments: [
      { name: 'guide-securite.pdf', url: 'https://example.com/file.pdf', size: 245678, contentType: 'application/pdf' },
    ],
    attachmentsExpireAt: '2026-07-10T00:00:00Z',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: '#f8fafc',
  borderLeft: '3px solid #0099cc',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '8px 0 18px',
}
const body = { fontSize: '14px', color: '#1f2937', lineHeight: '1.7', margin: '0 0 12px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '20px 0 0' }

const attachSection = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 18px',
  backgroundColor: '#ffffff',
}
const attachTitle = { fontSize: '13px', fontWeight: 600 as const, color: '#161f2e', margin: '0 0 10px' }
const attachItem = {
  borderTop: '1px solid #f1f5f9',
  paddingTop: '10px',
  marginTop: '6px',
}
const attachName = { fontSize: '13px', color: '#1f2937', margin: '0 0 6px' }
const attachMeta = { color: '#94a3b8', fontWeight: 400 as const }
const attachBtn = {
  backgroundColor: '#0099cc',
  color: '#ffffff',
  fontSize: '12px',
  padding: '6px 14px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 600 as const,
}
const attachExpire = { fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' as const, margin: '12px 0 0' }
