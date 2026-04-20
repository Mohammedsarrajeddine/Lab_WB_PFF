import { describe, expect, it } from 'vitest'
import {
  analysisStatusTone,
  formatDateTime,
  labelize,
  statusTone,
} from './utils'

describe('intake utils', () => {
  it('creates a fallback title-cased label for unknown values', () => {
    expect(labelize('pending_export')).toBe('Pending Export')
  })

  it('preserves invalid dates instead of crashing', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })

  it('returns a status tone for supported workflow states', () => {
    expect(statusTone('open')).toContain('text-sky-800')
    expect(analysisStatusTone('prepared')).toContain('text-emerald-800')
  })
})
