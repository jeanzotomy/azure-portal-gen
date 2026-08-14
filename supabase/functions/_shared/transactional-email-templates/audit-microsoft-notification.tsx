/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CloudMature'
const LOGO_URL = 'https://zwzazxebufydnaxezngx.supabase.co/storage/v1/object/public/email-assets/cloudmature-logo.png'

interface Field { label: string; value: string }

interface Props {
  companyName?: string
  fullName?: string
  email?: string
  phone?: string
  score?: number
  priority?: string
  priorityLabel?: string
  isUrgent?: boolean
  leadUrl?: string
  fields?: Field[]
  scoreBreakdown?: { label: string; points: number }[]
}

const Email = ({
  companyName = '', fullName = '', email = '', phone = '',
  score = 0, priorityLabel = '', isUrgent = false, leadUrl = '',
  fields = [], scoreBreakdown = [],
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {isUrgent ? 'PROSPECT PRIORITAIRE - ' : ''}Nouveau prospect audit Microsoft : {companyName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 0 20px' }} />

        {isUrgent ? (
          <Section style={urgentBox}>
            <Text style={urgentText}>
              Nouveau prospect prioritaire : renouvellement Microsoft prévu dans moins de six mois.
            </Text>
            <Text style={urgentMeta}>
              {companyName} — score {score} — {fullName}
              {phone ? ` — ${phone}` : ''}
            </Text>
          </Section>
        ) : null}

        <Heading style={h1}>Nouveau prospect : {companyName}</Heading>

        <Section style={card}>
          <Text style={cardLabel}>Score et priorité</Text>
          <Text style={cardValue}>{score} points — {priorityLabel}</Text>
        </Section>

        <Section style={card}>
          <Text style={cardLabel}>Contact</Text>
          <Text style={row}>{fullName}</Text>
          <Text style={row}>
            <Link href={`mailto:${email}`} style={linkStyle}>{email}</Link>
          </Text>
          {phone ? (
            <Text style={row}>
              <Link href={`tel:${phone.replace(/\s/g, '')}`} style={linkStyle}>{phone}</Link>
            </Text>
          ) : null}
        </Section>

        {leadUrl ? (
          <Section style={{ margin: '0 0 20px' }}>
            <Link href={leadUrl} style={btn}>Ouvrir la fiche du prospect</Link>
          </Section>
        ) : null}

        <Heading style={h2}>Récapitulatif des réponses</Heading>
        <Section style={table}>
          {fields.map((f) => (
            <Section key={f.label} style={rowBox}>
              <Text style={fieldLabel}>{f.label}</Text>
              <Text style={fieldValue}>{f.value || '—'}</Text>
            </Section>
          ))}
        </Section>

        {scoreBreakdown && scoreBreakdown.length > 0 ? (
          <>
            <Heading style={h2}>Détail du score</Heading>
            <Section style={table}>
              {scoreBreakdown.map((b) => (
                <Text key={b.label} style={row}>+{b.points} — {b.label}</Text>
              ))}
            </Section>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Notification automatique — {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.isUrgent
      ? `PROSPECT PRIORITAIRE — ${d.companyName || 'Nouveau prospect'} (score ${d.score ?? 0})`
      : `Nouveau prospect audit Microsoft — ${d.companyName || ''} (score ${d.score ?? 0})`,
  displayName: 'Audit Microsoft - notification interne',
  previewData: {
    companyName: 'Société Minière de Boké',
    fullName: 'Mamadou Alpha Diallo',
    email: 'm.diallo@example.gn',
    phone: '+224 622 11 22 33',
    score: 100,
    priorityLabel: 'Urgent',
    isUrgent: true,
    leadUrl: 'https://www.cloudmature.com/admin?tab=marketing-leads',
    fields: [
      { label: 'Secteur', value: 'Mines et sous-traitance minière' },
      { label: 'Ville', value: 'Boké' },
      { label: 'Employés', value: '101 à 250' },
    ],
    scoreBreakdown: [{ label: 'Renouvellement dans moins de 30 jours', points: 40 }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2e', margin: '0 0 18px' }
const h2 = { fontSize: '15px', fontWeight: 'bold' as const, color: '#161f2e', margin: '22px 0 10px' }
const card = {
  backgroundColor: '#f8fafc',
  borderLeft: '3px solid #0099cc',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 14px',
}
const urgentBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '10px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const urgentText = { fontSize: '15px', color: '#b91c1c', fontWeight: 700 as const, margin: '0 0 6px', lineHeight: '1.5' }
const urgentMeta = { fontSize: '13px', color: '#7f1d1d', margin: 0 }
const cardLabel = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.5px', fontWeight: 600 as const, margin: '0 0 6px' }
const cardValue = { fontSize: '16px', color: '#0099cc', fontWeight: 700 as const, margin: 0 }
const row = { fontSize: '14px', color: '#1f2937', margin: '0 0 4px', lineHeight: '1.5' }
const table = { border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px', margin: '0 0 12px' }
const rowBox = { borderBottom: '1px solid #f1f5f9', padding: '8px 0' }
const fieldLabel = { fontSize: '11px', color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '.4px' }
const fieldValue = { fontSize: '14px', color: '#1f2937', margin: 0, lineHeight: '1.5' }
const linkStyle = { color: '#0099cc' }
const btn = {
  backgroundColor: '#0099cc', color: '#ffffff', fontSize: '13px', padding: '10px 18px',
  borderRadius: '8px', textDecoration: 'none', fontWeight: 600 as const,
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const footer = { fontSize: '13px', color: '#0099cc', fontWeight: 600 as const, margin: '20px 0 0' }
