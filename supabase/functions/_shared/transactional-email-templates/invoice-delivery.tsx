/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  clientName?: string
  documentLabel?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string | null
  amountLabel?: string
  messageBody?: string
  downloadUrl?: string
  linkExpiresAt?: string | null
  senderName?: string
  senderRole?: string
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const Email = ({
  clientName,
  documentLabel,
  invoiceNumber,
  invoiceDate,
  dueDate,
  amountLabel,
  messageBody,
  downloadUrl,
  linkExpiresAt,
  senderName,
  senderRole,
}: Props) => {
  const label = documentLabel || 'Facture'
  const paragraphs = (messageBody || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`${label} ${invoiceNumber || ''} - ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
          <Heading style={h1}>{label} {invoiceNumber || ''}</Heading>
          <Text style={text}>
            {clientName ? `Bonjour ${clientName},` : 'Bonjour,'}
          </Text>

          <Section style={card}>
            {paragraphs.length > 0
              ? paragraphs.map((p, i) => <Text key={i} style={bodyText}>{p}</Text>)
              : <Text style={bodyText}>{messageBody || `Veuillez trouver ci-joint votre document ${label.toLowerCase()}.`}</Text>}
          </Section>

          <Section style={detailsBox}>
            <Text style={detailRow}><span style={detailKey}>Référence : </span>{invoiceNumber || '—'}</Text>
            {fmtDate(invoiceDate) && (
              <Text style={detailRow}><span style={detailKey}>Date d'émission : </span>{fmtDate(invoiceDate)}</Text>
            )}
            {fmtDate(dueDate) && (
              <Text style={detailRow}><span style={detailKey}>Échéance : </span>{fmtDate(dueDate)}</Text>
            )}
            {amountLabel && (
              <Text style={amountText}><span style={detailKey}>Montant total : </span>{amountLabel}</Text>
            )}
          </Section>

          {downloadUrl && (
            <Section style={{ margin: '0 0 18px' }}>
              <Button href={downloadUrl} style={ctaBtn}>Télécharger le document (PDF)</Button>
              {linkExpiresAt && fmtDate(linkExpiresAt) && (
                <Text style={expire}>Ce lien de téléchargement expire le {fmtDate(linkExpiresAt)}.</Text>
              )}
            </Section>
          )}

          <Hr style={hr} />
          <Text style={small}>
            Document transmis par {senderName || `l'équipe ${SITE_NAME}`}{senderRole ? ` (${senderRole})` : ''}.
            Pour toute question, écrivez à{' '}
            <Link href="mailto:facture@cloudmature.com" style={{ color: '#0099cc' }}>facture@cloudmature.com</Link>.
          </Text>
          <Text style={footer}>Bien cordialement,<br />L'équipe {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d.documentLabel || 'Facture'} ${d.invoiceNumber || ''} - ${SITE_NAME}`.trim(),
  displayName: 'Envoi de facture au client',
  previewData: {
    clientName: 'Société Exemple SARL',
    documentLabel: 'Facture',
    invoiceNumber: 'CM-FACT00042',
    invoiceDate: '2026-07-20',
    dueDate: '2026-08-20',
    amountLabel: '12 500 000 GNF',
    messageBody: "Veuillez trouver votre facture en pièce jointe.\n\nMerci de procéder au règlement avant la date d'échéance.",
    downloadUrl: 'https://example.com/facture.pdf',
    linkExpiresAt: '2026-08-20T00:00:00Z',
    senderName: 'Service comptabilité',
    senderRole: 'Comptable',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 12px' }
const card = {
  backgroundColor: '#f8fafc',
  borderLeft: '3px solid #0099cc',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '8px 0 18px',
}
const bodyText = { fontSize: '14px', color: '#1f2937', lineHeight: '1.7', margin: '0 0 12px', whiteSpace: 'pre-wrap' as const }
const detailsBox = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 18px',
  backgroundColor: '#ffffff',
}
const detailRow = { fontSize: '13px', color: '#1f2937', margin: '0 0 6px' }
const detailKey = { color: '#64748b' }
const amountText = { fontSize: '15px', color: '#161f2e', fontWeight: 700 as const, margin: '8px 0 0' }
const ctaBtn = {
  backgroundColor: '#0099cc',
  color: '#ffffff',
  fontSize: '14px',
  padding: '11px 22px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 600 as const,
}
const expire = { fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' as const, margin: '12px 0 0' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '20px 0 0' }
