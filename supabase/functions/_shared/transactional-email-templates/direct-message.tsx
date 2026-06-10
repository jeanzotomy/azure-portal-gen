/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  recipientName?: string
  senderName?: string
  senderRole?: string
  messageSubject?: string
  messageBody?: string
}

const Email = ({ recipientName, senderName, senderRole, messageSubject, messageBody }: Props) => {
  const paragraphs = (messageBody || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
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
