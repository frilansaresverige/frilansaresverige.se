import { describe, expect, it } from 'vitest'

import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('allows paths inside the archive', () => {
    expect(safeNext('/arkiv')).toBe('/arkiv')
    expect(safeNext('/arkiv?q=moms')).toBe('/arkiv?q=moms')
    expect(safeNext('/arkiv/C0GENERAL/1800000000.000100')).toBe(
      '/arkiv/C0GENERAL/1800000000.000100',
    )
  })

  it('refuses anything else', () => {
    for (const next of [
      null,
      '',
      'https://evil.example/arkiv',
      '//evil.example/arkiv',
      '/arkivet',
      '/uppdrag',
      '/arkiv//evil.example',
    ]) {
      expect(safeNext(next)).toBe('/arkiv')
    }
  })
})
