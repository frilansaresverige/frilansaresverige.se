import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearDraft,
  emptyDraft,
  loadDraft,
  MAX_AGE_MS,
  saveDraft,
} from './draftStorage'

const KEY = 'frilansaresverige:uppdrag-utkast'
const draft = {
  ...emptyDraft,
  title: 'Utvecklare',
  senderType: 'BROKER' as const,
}

describe('draftStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a draft with its timestamp', () => {
    saveDraft(draft, 'anna@example.com', 1000)

    expect(loadDraft(2000)).toEqual({
      draft,
      emailAddress: 'anna@example.com',
      savedAt: 1000,
    })
  })

  it('discards drafts older than seven days', () => {
    saveDraft(draft, '', 1000)

    expect(loadDraft(1000 + MAX_AGE_MS)).not.toBeNull()
    expect(loadDraft(1001 + MAX_AGE_MS)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not keep an empty form', () => {
    saveDraft(draft, '', 1000)
    saveDraft(emptyDraft, '', 2000)

    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('ignores fields of the wrong type and unknown sender types', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        savedAt: 1000,
        draft: { title: 42, contact: 'Anna', senderType: 'OTHER', extra: 'x' },
      }),
    )

    expect(loadDraft(2000)?.draft).toEqual({ ...emptyDraft, contact: 'Anna' })
  })

  it('survives corrupt data', () => {
    localStorage.setItem(KEY, '{not json')

    expect(loadDraft()).toBeNull()
  })

  it('clears the draft', () => {
    saveDraft(draft, '', 1000)
    clearDraft()

    expect(loadDraft(2000)).toBeNull()
  })
})
