import * as React from 'npm:react@18.3.1'
import { Html, Head, Preview, Body, Container, Heading, Text, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { clientName?: string; title?: string; message?: string; pdfUrl?: string; wordUrl?: string }
const Email = ({ clientName, title, message, pdfUrl, wordUrl }: Props) => (
  <Html lang="fr"><Head /><Preview>Votre proposition CloudMature</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <Container style={{ padding: '24px', maxWidth: '600px' }}>
        <Heading style={{ color: '#007aa3', fontSize: '22px' }}>CloudMature</Heading>
        <Heading style={{ fontSize: '20px' }}>{title || 'Votre proposition commerciale'}</Heading>
        <Text>Bonjour {clientName || ''},</Text>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{message || 'Voici la proposition préparée pour votre demande.'}</Text>
        {pdfUrl && <Button href={pdfUrl} style={button}>Télécharger le PDF</Button>}
        {wordUrl && <Button href={wordUrl} style={button}>Télécharger le Word</Button>}
        <Text>Ces liens privés sont valables 7 jours. Merci de ne pas les transmettre à des tiers.</Text>
        <Text>Bien cordialement,<br />L’équipe CloudMature</Text>
      </Container>
    </Body>
  </Html>
)
const button = { backgroundColor: '#007aa3', color: '#ffffff', borderRadius: '6px', padding: '12px 18px', margin: '8px', fontSize: '14px' }
export const template = { component: Email, subject: (d: Record<string, unknown>) => `Proposition : ${String(d.title || 'CloudMature').replace(/[\r\n]/g, ' ').slice(0, 150)}`, displayName: 'Proposition demandée par le client' } satisfies TemplateEntry