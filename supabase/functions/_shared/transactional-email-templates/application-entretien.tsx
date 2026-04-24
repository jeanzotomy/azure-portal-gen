/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  candidateName?: string
  jobTitle?: string
  interviewMessage?: string
}

const Email = ({ candidateName, jobTitle, interviewMessage }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Invitation à un entretien — {jobTitle || 'CloudMature'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>Nous souhaitons vous rencontrer</Heading>
        <Text style={text}>Bonjour {candidateName || ''},</Text>
        <Text style={text}>
          Suite à l'examen de votre candidature pour le poste de <strong>{jobTitle || 'CloudMature'}</strong>,
          nous avons le plaisir de vous inviter à un entretien.
        </Text>
        {interviewMessage && (
          <Section style={messageBox}>
            <Text style={messageLabel}>Détails de l'entretien :</Text>
            <Text style={messageText}>{interviewMessage}</Text>
          </Section>
        )}
        <Text style={text}>
          Merci de confirmer votre disponibilité en répondant à cet email. Nous restons à votre disposition pour toute question.
        </Text>
        <Text style={footer}>À très bientôt,<br />L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Invitation à un entretien — ${d.jobTitle || 'CloudMature'}`,
  displayName: 'Invitation entretien',
  previewData: {
    candidateName: 'Mamadou Diallo',
    jobTitle: 'Ingénieur Cloud DevOps',
    interviewMessage: 'Entretien prévu le mardi 30 avril 2026 à 10h00 (GMT) en visioconférence Microsoft Teams. Le lien vous sera envoyé 24h avant.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const messageBox = { backgroundColor: '#f0f9ff', borderLeft: '4px solid #0099cc', padding: '14px 18px', borderRadius: '6px', margin: '20px 0' }
const messageLabel = { fontSize: '12px', color: '#0099cc', fontWeight: 700 as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 6px' }
const messageText = { fontSize: '14px', color: '#161f2e', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '30px 0 0' }
