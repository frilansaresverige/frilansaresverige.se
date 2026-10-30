import 'server-only'

import { randomInt } from 'node:crypto'

import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import type { SenderType } from '@/lib/assignmentFields'
import { assignment, assignmentComment, type Assignment } from '@/lib/db/schema'
import { slackEnv } from '@/lib/env'

export type { Assignment, AssignmentComment } from '@/lib/db/schema'

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// The id is the only thing protecting the edit page, so it has to come from a
// cryptographically secure source.
export const createAssignmentId = (length = 16) =>
  Array.from({ length }, () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]).join(
    '',
  )

export const getTimestamp = () => Math.round(Date.now() / 1000)

export interface NewAssignment {
  senderType: SenderType
  emailAddress: string
  customerName: string
  customerOrganizationNumber: string
  customerFee: string | null
  clientHourlyRate: number | null
  title: string
  description: string
  contact: string
  location: string
}

export const saveAssignment = async (input: NewAssignment) => {
  const id = createAssignmentId()

  await db()
    .insert(assignment)
    .values({
      ...input,
      id,
      clientHourlyRate:
        input.clientHourlyRate === null ? null : String(input.clientHourlyRate),
      created: getTimestamp(),
      slackChannel:
        input.senderType === 'BROKER'
          ? slackEnv().SLACK_CHANNEL_BROKER
          : slackEnv().SLACK_CHANNEL_DIRECT,
    })

  return id
}

export const getAssignment = async (
  assignmentId: string,
): Promise<Assignment | null> => {
  const [row] = await db()
    .select()
    .from(assignment)
    .where(eq(assignment.id, assignmentId))

  return row ?? null
}

export const getAssignmentsThatNeedSlackPropagation = async () =>
  (
    await db()
      .select({ id: assignment.id })
      .from(assignment)
      .where(isNull(assignment.slackId))
  ).map((row) => row.id)

export const getAssignmentsThatNeedSlackDeletion = async () =>
  (
    await db()
      .select({ id: assignment.id })
      .from(assignment)
      .where(
        and(isNotNull(assignment.deleted), eq(assignment.slackDeleted, false)),
      )
  ).map((row) => row.id)

export const getAssignmentComments = (assignmentId: string) =>
  db()
    .select()
    .from(assignmentComment)
    .where(eq(assignmentComment.assignment, assignmentId))
    .orderBy(asc(assignmentComment.id))

export const saveAssignmentComment = async (
  assignmentId: string,
  comment: string,
) => {
  await db()
    .insert(assignmentComment)
    .values({
      assignment: assignmentId,
      // Same numbering as before: the next comment gets count + 1.
      id: sql`(SELECT COUNT(*) + 1 FROM ${assignmentComment} AS t WHERE t.assignment = ${assignmentId})`,
      comment,
      created: getTimestamp(),
    })
}

export const updateAssignment = (
  assignmentId: string,
  values: Partial<
    Pick<
      Assignment,
      'slackId' | 'slackThreadId' | 'slackChannelId' | 'slackDeleted'
    >
  >,
) => db().update(assignment).set(values).where(eq(assignment.id, assignmentId))

export const setAssignmentCommentSlackId = (
  assignmentId: string,
  id: number,
  slackId: string,
) =>
  db()
    .update(assignmentComment)
    .set({ slackId })
    .where(
      and(
        eq(assignmentComment.assignment, assignmentId),
        eq(assignmentComment.id, id),
      ),
    )

// Guarded so a repeated delete keeps the original timestamp.
export const deleteAssignment = async (assignmentId: string) => {
  const [result] = await db()
    .update(assignment)
    .set({ deleted: getTimestamp() })
    .where(and(eq(assignment.id, assignmentId), isNull(assignment.deleted)))

  return result.affectedRows === 1
}

export const checkDatabaseHealth = async () => {
  await db().execute(sql`SELECT 1 FROM ${assignment} LIMIT 1`)
}
