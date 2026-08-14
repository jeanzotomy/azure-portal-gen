/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Highlight { label: string; value: string }

interface Props {
  fullName?: string
  companyName?: string
  formTitle?: string
  highlights?: Highlight[]
}

const Email = ({ fullName = '', companyName = '', formTitle = 'votre demande', highlights = [] }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande « {formTitle} » a bien été enregistrée</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>Votre demande a bien été enregistrée</Heading>
        <Text style={text}>
          Bonjour {fullName},<br /><br />
          Merci pour votre confiance. Nous avons bien reçu votre formulaire « {formTitle} »
          {companyName ? ` pour ${companyName}` : ''}. Un conseiller Cloud Mature vous contactera
          prochainement pour donner suite à votre demande.
        </Text>

        {highlights && highlights.length > 0 ? (
          <Section style={card}>
            <Text style={cardLabel}>Récapitulatif de vos réponses</Text>
            {highlights.map((h) => (
              <Text key={h.label} style={bullet}>• {h.label} : {h.value}</Text>
            ))}
          </Section>
        ) : null}

        <Text style={text}>
          Une demande urgente ? Contactez-nous directement :<br />
          Téléphone / WhatsApp :{' '}
          <Link href="tel:+224626441150" style={linkStyle}>+224 626 441 150</Link><br />
          E-mail : <Link href="mailto:info@cloudmature.com" style={linkStyle}>info@cloudmature.com</Link><br />
          Site : <Link href="https://www.cloudmature.com" style={linkStyle}>www.cloudmature.com</Link>
        </Text>

        <Hr style={hr} />
        <Text style={small}>
          Vous recevez ce message car vous avez soumis un formulaire sur notre site. Vous pouvez retirer
          votre consentement à tout moment en écrivant à{' '}
          <Link href="mailto:info@cloudmature.com" style={linkStyle}>info@cloudmature.com</Link>.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Votre demande « ${d.formTitle || 'formulaire'} » est bien enregistrée`,
  displayName: 'Formulaire marketing - confirmation au prospect',
  previewData: {
    fullName: 'Mamadou Alpha Diallo',
    companyName: 'Société Minière de Boké',
    formTitle: 'Audit gratuit de vos licences Microsoft',
    highlights: [
      { label: 'Échéance de renouvellement', value: 'Dans 1 à 3 mois' },
      { label: 'Besoins principaux', value: 'Renouveler mes licences, Réduire mes coûts' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: '#f0f9ff',
  borderLeft: '3px solid #0099cc',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 16px',
}
const cardLabel = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.5px', fontWeight: 600 as const, margin: '0 0 6px' }
const bullet = { fontSize: '14px', color: '#1f2937', margin: '0 0 4px', lineHeight: '1.5' }
const linkStyle = { color: '#0099cc' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '20px 0 0' }
