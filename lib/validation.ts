import { z } from 'zod'

import { limits, senderTypes } from '@/lib/assignmentFields'

// https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
const EMAIL_PATTERN =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export const normalizeEmailAddress = (emailAddress: unknown) => {
  if (typeof emailAddress !== 'string') {
    return null
  }

  const normalized = emailAddress.trim().toLowerCase()

  if (
    normalized.length > limits.emailAddress ||
    !EMAIL_PATTERN.test(normalized)
  ) {
    return null
  }

  return normalized
}

const text = (max: number) => z.string().trim().max(max)
const requiredText = (max: number) => text(max).min(1)

export const newAssignmentSchema = z
  .object({
    senderType: z.enum(senderTypes),
    title: requiredText(limits.title),
    location: text(limits.location),
    customerName: requiredText(limits.customerName),
    customerOrganizationNumber: text(limits.customerOrganizationNumber),
    customerFee: text(limits.customerFee)
      .nullable()
      .transform((value) => value || null),
    clientHourlyRate: z.number().int().min(0).max(1_000_000).nullable(),
    description: requiredText(limits.longText),
    contact: requiredText(limits.longText),
  })
  // Fields that only apply to brokers are dropped for direct assignments, in
  // case they were filled in before the sender type was changed.
  .transform((assignment) =>
    assignment.senderType === 'DIRECT'
      ? { ...assignment, customerOrganizationNumber: '', customerFee: null }
      : assignment,
  )

export type NewAssignmentInput = z.input<typeof newAssignmentSchema>

export const commentSchema = requiredText(limits.longText)

// Server actions can be called with any arguments, so even the id is checked.
export const assignmentIdSchema = z.string().regex(/^[A-Za-z0-9]{1,255}$/)

// Submissions from these domains have been spam. They are told that publishing
// succeeded, but nothing is saved.
const IGNORED_EMAIL_DOMAINS = ['gmail.com', 'partna.se']

export const isIgnoredEmailAddress = (emailAddress: string) =>
  IGNORED_EMAIL_DOMAINS.some((domain) => emailAddress.endsWith(`@${domain}`))
