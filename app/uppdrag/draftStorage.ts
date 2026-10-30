import { senderTypes, type SenderType } from '@/lib/assignmentFields'

export interface Draft {
  senderType: SenderType | null
  title: string
  location: string
  customerName: string
  customerOrganizationNumber: string
  customerFee: string
  isNonTransparentFee: boolean
  clientHourlyRate: string
  description: string
  contact: string
}

export const emptyDraft: Draft = {
  senderType: null,
  title: '',
  location: '',
  customerName: '',
  customerOrganizationNumber: '',
  customerFee: '',
  isNonTransparentFee: false,
  clientHourlyRate: '',
  description: '',
  contact: '',
}

export interface StoredDraft {
  draft: Draft
  emailAddress: string
  savedAt: number
}

const STORAGE_KEY = 'frilansaresverige:uppdrag-utkast'
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const isEmptyDraft = (draft: Draft, emailAddress: string) =>
  !emailAddress &&
  (Object.keys(emptyDraft) as (keyof Draft)[]).every(
    (key) => draft[key] === emptyDraft[key],
  )

// Only takes over fields of the expected type, so that a draft saved by an
// older version of the form, or tampered with, can't break it.
const sanitize = (value: unknown): Draft => {
  const stored = (typeof value === 'object' && value) || {}
  const draft = { ...emptyDraft }

  for (const key of Object.keys(emptyDraft) as (keyof Draft)[]) {
    const field = (stored as Record<string, unknown>)[key]

    if (key === 'senderType') {
      draft.senderType = senderTypes.includes(field as SenderType)
        ? (field as SenderType)
        : null
    } else if (typeof field === typeof emptyDraft[key]) {
      Object.assign(draft, { [key]: field })
    }
  }

  return draft
}

// Storage can be unavailable (private browsing, disabled cookies) or full, in
// which case the form simply works without drafts.
export const loadDraft = (now = Date.now()): StoredDraft | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw === null) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredDraft>

    if (
      typeof parsed.savedAt !== 'number' ||
      now - parsed.savedAt > MAX_AGE_MS
    ) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      draft: sanitize(parsed.draft),
      emailAddress:
        typeof parsed.emailAddress === 'string' ? parsed.emailAddress : '',
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

export const saveDraft = (
  draft: Draft,
  emailAddress: string,
  now = Date.now(),
) => {
  try {
    if (isEmptyDraft(draft, emailAddress)) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ draft, emailAddress, savedAt: now }),
      )
    }
  } catch {
    // See loadDraft.
  }
}

export const clearDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // See loadDraft.
  }
}
