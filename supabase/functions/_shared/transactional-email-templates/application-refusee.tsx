/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  candidateName?: string
  jobTitle?: string
}

const Email = ({ candidateName, jobTitle }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réponse à votre candidature — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>Réponse à votre candidature</Heading>
        <Text style={text}>Bonjour {candidateName || ''},</Text>
        <Text style={text}>
          Nous vous remercions sincèrement pour l'intérêt que vous avez porté à CloudMature et pour
          le temps consacré à votre candidature au poste de <strong>{jobTitle || 'notre offre'}</strong>.
        </Text>
        <Text style={text}>
          Après une étude attentive de votre dossier, nous sommes au regret de vous informer que
          nous ne donnerons pas suite à votre candidature pour ce poste.
        </Text>
        <Text style={text}>
          Cette décision ne remet aucunement en cause la qualité de votre profil. Nous conserverons votre candidature
          et n'hésiterons pas à revenir vers vous si une opportunité correspondant davantage à votre parcours se présente.
        </Text>
        <Text style={text}>
          Nous vous souhaitons plein succès dans la suite de vos démarches professionnelles.
        </Text>
        <Text style={footer}>Cordialement,<br />L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Réponse à votre candidature — ${d.jobTitle || SITE_NAME}`,
  displayName: 'Candidature non retenue',
  previewData: { candidateName: 'Mamadou Diallo', jobTitle: 'Ingénieur Cloud DevOps' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '30px 0 0' }
