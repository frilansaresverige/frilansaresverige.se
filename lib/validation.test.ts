import { describe, expect, it } from 'vitest'

import {
  isIgnoredEmailAddress,
  newAssignmentSchema,
  normalizeEmailAddress,
} from './validation'

const valid = {
  senderType: 'BROKER' as const,
  title: ' Titel ',
  location: '',
  customerName: 'Kund AB',
  customerOrganizationNumber: '556677-8899',
  customerFee: '',
  clientHourlyRate: 900,
  description: 'Beskrivning',
  contact: 'Kontakt',
}

describe('normalizeEmailAddress', () => {
  it('trims and lowercases valid addresses', () => {
    expect(normalizeEmailAddress('  Anna@Example.COM ')).toBe(
      'anna@example.com',
    )
  })

  it('rejects invalid and overly long addresses', () => {
    expect(normalizeEmailAddress('anna@')).toBeNull()
    expect(normalizeEmailAddress(42)).toBeNull()
    expect(normalizeEmailAddress(`${'a'.repeat(45)}@example.com`)).toBeNull()
  })
})

describe('newAssignmentSchema', () => {
  it('trims text and turns an empty fee into null', () => {
    const result = newAssignmentSchema.parse(valid)

    expect(result.title).toBe('Titel')
    expect(result.customerFee).toBeNull()
  })

  it('drops broker-only fields from direct assignments', () => {
    const result = newAssignmentSchema.parse({
      ...valid,
      senderType: 'DIRECT',
      customerFee: '10 %',
    })

    expect(result.customerOrganizationNumber).toBe('')
    expect(result.customerFee).toBeNull()
  })

  it('requires the mandatory fields', () => {
    expect(
      newAssignmentSchema.safeParse({ ...valid, title: ' ' }).success,
    ).toBe(false)
    expect(
      newAssignmentSchema.safeParse({ ...valid, senderType: 'OTHER' }).success,
    ).toBe(false)
    expect(
      newAssignmentSchema.safeParse({ ...valid, title: 'x'.repeat(51) })
        .success,
    ).toBe(false)
  })
})

describe('isIgnoredEmailAddress', () => {
  it('matches whole domains only', () => {
    expect(isIgnoredEmailAddress('anna@gmail.com')).toBe(true)
    expect(isIgnoredEmailAddress('anna@notgmail.com')).toBe(false)
  })
})
