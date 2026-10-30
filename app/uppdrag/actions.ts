'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import {
  deleteAssignment as markAssignmentDeleted,
  getAssignment,
  saveAssignment,
  saveAssignmentComment,
} from '@/lib/assignments'
import { sendConfirmationEmail } from '@/lib/email'
import {
  propagateAssignment,
  propagateAssignmentComments,
  propagateAssignmentDeletion,
} from '@/lib/slack'
import {
  assignmentIdSchema,
  commentSchema,
  isIgnoredEmailAddress,
  newAssignmentSchema,
  normalizeEmailAddress,
  type NewAssignmentInput,
} from '@/lib/validation'

export type ActionResult =
  | { ok: true }
  | {
      ok: false
      error: 'INVALID_EMAIL_ADDRESS' | 'INVALID_INPUT' | 'NOT_FOUND'
    }

// Runs after the response has been sent, logging instead of throwing.
const afterResponse = (description: string, task: () => Promise<unknown>) =>
  after(async () => {
    try {
      await task()
    } catch (error) {
      console.error(`Failed to ${description}:`, error)
    }
  })

export async function publishAssignment(
  input: NewAssignmentInput,
  emailAddressInput: string,
): Promise<ActionResult> {
  const emailAddress = normalizeEmailAddress(emailAddressInput)

  if (emailAddress === null) {
    return { ok: false, error: 'INVALID_EMAIL_ADDRESS' }
  }

  const parsed = newAssignmentSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT' }
  }

  if (isIgnoredEmailAddress(emailAddress)) {
    return { ok: true }
  }

  const assignmentId = await saveAssignment({ ...parsed.data, emailAddress })

  afterResponse(`post assignment ${assignmentId} to Slack`, () =>
    propagateAssignment(assignmentId),
  )
  afterResponse(`send confirmation for assignment ${assignmentId}`, () =>
    sendConfirmationEmail(assignmentId),
  )

  return { ok: true }
}

export async function addComment(
  assignmentId: string,
  commentInput: string,
): Promise<ActionResult> {
  const comment = commentSchema.safeParse(commentInput)

  if (!assignmentIdSchema.safeParse(assignmentId).success) {
    return { ok: false, error: 'NOT_FOUND' }
  }

  if (!comment.success) {
    return { ok: false, error: 'INVALID_INPUT' }
  }

  const assignment = await getAssignment(assignmentId)

  if (assignment === null || assignment.deleted !== null) {
    return { ok: false, error: 'NOT_FOUND' }
  }

  await saveAssignmentComment(assignmentId, comment.data)

  afterResponse(`post comments on assignment ${assignmentId} to Slack`, () =>
    propagateAssignmentComments(assignmentId),
  )
  revalidatePath(`/uppdrag/${assignmentId}`)

  return { ok: true }
}

export async function deleteAssignment(
  assignmentId: string,
): Promise<ActionResult> {
  if (!assignmentIdSchema.safeParse(assignmentId).success) {
    return { ok: false, error: 'NOT_FOUND' }
  }

  const assignment = await getAssignment(assignmentId)

  if (assignment === null) {
    return { ok: false, error: 'NOT_FOUND' }
  }

  await markAssignmentDeleted(assignmentId)

  afterResponse(`propagate deletion of assignment ${assignmentId}`, () =>
    propagateAssignmentDeletion(assignmentId),
  )
  revalidatePath(`/uppdrag/${assignmentId}`)

  return { ok: true }
}
