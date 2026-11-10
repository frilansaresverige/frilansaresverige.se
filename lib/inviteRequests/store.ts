import 'server-only'

import { eq } from 'drizzle-orm'

import { getTimestamp } from '@/lib/assignments'
import { db } from '@/lib/db'
import { slackMessageTemplate } from '@/lib/db/schema'

import { DEFAULT_REJECTION_TEMPLATE } from './template'

const REJECTION_TEMPLATE = 'inviteRequestRejection'

export const getRejectionTemplate = async () => {
  const [row] = await db()
    .select()
    .from(slackMessageTemplate)
    .where(eq(slackMessageTemplate.name, REJECTION_TEMPLATE))

  return row ?? null
}

export const getRejectionTemplateBody = async () =>
  (await getRejectionTemplate())?.body ?? DEFAULT_REJECTION_TEMPLATE

export const saveRejectionTemplate = async (body: string, userId: string) => {
  const values = { body, updated: getTimestamp(), updatedBy: userId }

  await db()
    .insert(slackMessageTemplate)
    .values({ name: REJECTION_TEMPLATE, ...values })
    .onDuplicateKeyUpdate({ set: values })
}

// Back to the built-in default.
export const resetRejectionTemplate = () =>
  db()
    .delete(slackMessageTemplate)
    .where(eq(slackMessageTemplate.name, REJECTION_TEMPLATE))
