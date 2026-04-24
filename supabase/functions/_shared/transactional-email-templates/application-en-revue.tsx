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
    <Preview>Votre candidature pour {jobTitle || 'le poste'} est en cours d'examen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>Votre candidature est en cours d'examen</Heading>
        <Text style={text}>
          Bonjour {candidateName || ''},
        </Text>
        <Text style={text}>
          Nous vous remercions de l'intérêt que vous portez à CloudMature. Votre candidature pour le poste de{' '}
          <strong>{jobTitle || 'votre intérêt'}</strong> a bien été reçue et est actuellement en cours d'examen par notre équipe RH.
        </Text>
        <Text style={text}>
          Nous reviendrons vers vous dans les meilleurs délais avec la suite du processus.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Votre candidature pour ${d.jobTitle || 'le poste'} est en cours d'examen`,
  displayName: 'Candidature en revue',
  previewData: { candidateName: 'Mamadou Diallo', jobTitle: 'Ingénieur Cloud DevOps' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '30px 0 0' }
