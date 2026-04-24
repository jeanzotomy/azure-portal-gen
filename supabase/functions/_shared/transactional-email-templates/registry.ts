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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-en-revue': applicationEnRevue,
  'application-entretien': applicationEntretien,
  'application-acceptee': applicationAcceptee,
  'application-refusee': applicationRefusee,
}
