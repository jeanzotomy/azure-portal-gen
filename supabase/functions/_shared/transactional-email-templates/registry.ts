/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as applicationEnRevue } from './application-en-revue.tsx'
import { template as applicationEntretien } from './application-entretien.tsx'
import { template as applicationAcceptee } from './application-acceptee.tsx'
import { template as applicationRefusee } from './application-refusee.tsx'
import { template as directMessage } from './direct-message.tsx'
import { template as contactOtp } from './contact-otp.tsx'
import { template as invoiceDelivery } from './invoice-delivery.tsx'
import { template as auditMicrosoftConfirmation } from './audit-microsoft-confirmation.tsx'
import { template as auditMicrosoftNotification } from './audit-microsoft-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-en-revue': applicationEnRevue,
  'application-entretien': applicationEntretien,
  'application-acceptee': applicationAcceptee,
  'application-refusee': applicationRefusee,
  'direct-message': directMessage,
  'contact-otp': contactOtp,
  'invoice-delivery': invoiceDelivery,
  'audit-microsoft-confirmation': auditMicrosoftConfirmation,
  'audit-microsoft-notification': auditMicrosoftNotification,
}
