/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  code?: string
  expiresInMinutes?: number
}

const Email = ({ code = '------', expiresInMinutes = 10 }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification {SITE_NAME} : {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>Vérification de votre adresse e-mail</Heading>
        <Text style={text}>
          Bonjour,<br /><br />
          Vous avez initié une demande de contact sur le site {SITE_NAME}. Pour confirmer
          que cette adresse e-mail vous appartient, veuillez saisir le code à 6 chiffres
          ci-dessous dans le formulaire de contact :
        </Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{code}</Text>
        </Section>
        <Text style={small}>
          Ce code est valable {expiresInMinutes} minutes. Si vous n'êtes pas à l'origine de
          cette demande, vous pouvez ignorer ce message en toute sécurité.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Votre code de vérification ${SITE_NAME} : ${d.code || ''}`.trim(),
  displayName: 'Code de vérification — formulaire de contact',
  previewData: { code: '482913', expiresInMinutes: 10 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox = {
  backgroundColor: '#f0f9ff',
  border: '2px dashed #0099cc',
  borderRadius: '10px',
  padding: '20px',
  margin: '12px 0 18px',
  textAlign: 'center' as const,
}
const codeStyle = {
  fontSize: '32px',
  fontWeight: 700 as const,
  letterSpacing: '8px',
  color: '#0099cc',
  margin: 0,
  fontFamily: "'Courier New', monospace",
}
const small = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '20px 0 0' }
