/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Props {
  candidateName?: string
  jobTitle?: string
  activationUrl?: string
}

const Email = ({ candidateName, jobTitle, activationUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Félicitations ! Votre candidature a été acceptée</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>🎉 Félicitations {candidateName || ''} !</Heading>
        <Text style={text}>
          Nous avons le plaisir de vous annoncer que votre candidature pour le poste de{' '}
          <strong>{jobTitle || 'CloudMature'}</strong> a été <strong style={{ color: '#10b981' }}>acceptée</strong>.
        </Text>
        <Text style={text}>
          Pour finaliser votre intégration, veuillez activer votre compte sur le portail CloudMature.
          Vous y retrouverez l'ensemble des prochaines étapes (signature du contrat, documents administratifs,
          accès aux outils).
        </Text>
        {activationUrl && (
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button style={button} href={activationUrl}>
              Activer mon compte CloudMature
            </Button>
          </div>
        )}
        <Text style={small}>
          Ce lien d'activation est valable 7 jours. Si vous rencontrez le moindre problème, n'hésitez pas à nous répondre directement.
        </Text>
        <Text style={footer}>Bienvenue dans l'équipe !<br />L'équipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `🎉 Félicitations — Votre candidature pour ${d.jobTitle || 'CloudMature'} a été acceptée`,
  displayName: 'Candidature acceptée',
  previewData: {
    candidateName: 'Mamadou Diallo',
    jobTitle: 'Ingénieur Cloud DevOps',
    activationUrl: 'https://cloudmature.com/auth?welcome=1',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#0099cc', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const small = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '30px 0 0' }
