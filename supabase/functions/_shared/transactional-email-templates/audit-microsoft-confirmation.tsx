/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  fullName?: string
  companyName?: string
  renewalTimeline?: string
  mainNeeds?: string[]
}

const Email = ({ fullName = '', companyName = '', renewalTimeline = '', mainNeeds = [] }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande d'audit gratuit de licences Microsoft a bien été enregistrée</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>Votre demande d'audit a bien été enregistrée</Heading>
        <Text style={text}>
          Bonjour {fullName},<br /><br />
          Merci pour votre confiance. Nous avons bien reçu votre demande d'audit gratuit de licences
          Microsoft{companyName ? ` pour ${companyName}` : ''}. Un conseiller Cloud Mature vous contactera
          prochainement afin d'examiner vos licences, votre prochaine échéance et les possibilités
          d'optimisation.
        </Text>

        {renewalTimeline ? (
          <Section style={card}>
            <Text style={cardLabel}>Échéance de renouvellement déclarée</Text>
            <Text style={cardValue}>{renewalTimeline}</Text>
          </Section>
        ) : null}

        {mainNeeds && mainNeeds.length > 0 ? (
          <Section style={card}>
            <Text style={cardLabel}>Vos besoins prioritaires</Text>
            {mainNeeds.map((need) => (
              <Text key={need} style={bullet}>• {need}</Text>
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
          Vous recevez ce message car vous avez soumis le formulaire d'audit de licences Microsoft sur
          notre site. Vous pouvez retirer votre consentement à tout moment en écrivant à{' '}
          <Link href="mailto:info@cloudmature.com" style={linkStyle}>info@cloudmature.com</Link>.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Votre demande d\'audit gratuit de licences Microsoft est bien enregistrée',
  displayName: 'Audit Microsoft - confirmation au prospect',
  previewData: {
    fullName: 'Mamadou Alpha Diallo',
    companyName: 'Société Minière de Boké',
    renewalTimeline: 'Dans 1 à 3 mois',
    mainNeeds: ['Renouveler mes licences', 'Réduire mes coûts'],
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
const cardValue = { fontSize: '16px', color: '#0099cc', fontWeight: 700 as const, margin: 0 }
const bullet = { fontSize: '14px', color: '#1f2937', margin: '0 0 4px', lineHeight: '1.5' }
const linkStyle = { color: '#0099cc' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '20px 0 0' }
