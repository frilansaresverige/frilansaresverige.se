import 'server-only'

import {
  getAssignment,
  getAssignmentComments,
  getAssignmentsThatNeedSlackDeletion,
  getAssignmentsThatNeedSlackPropagation,
  setAssignmentCommentSlackId,
  updateAssignment,
} from '@/lib/assignments'
import { siteUrl, slackEnv } from '@/lib/env'
import { fillTemplate, templates } from '@/lib/templates'

interface SlackResponse {
  ok: boolean
  error?: string
  [key: string]: unknown
}

const callSlack = async (
  method: string,
  params: Record<string, string | undefined>,
  httpMethod: 'GET' | 'POST' = 'POST',
): Promise<SlackResponse> => {
  const body = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  )
  const url = new URL(
    `${slackEnv().SLACK_API_URL.replace(/\/+$/, '')}/${method}`,
  )
  if (httpMethod === 'GET') {
    url.search = body.toString()
  }

  const response = await fetch(url, {
    method: httpMethod,
    headers: { Authorization: `Bearer ${slackEnv().SLACK_TOKEN}` },
    body: httpMethod === 'POST' ? body : undefined,
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Slack ${method} responded with HTTP ${response.status}`)
  }

  return (await response.json()) as SlackResponse
}

// Returns the message's ts, or null if posting failed.
const postMessage = async (
  description: string,
  params: Record<string, string | undefined>,
) => {
  try {
    const response = await callSlack('chat.postMessage', params)

    if (response.ok) {
      return {
        ts: response.ts as string,
        channel: response.channel as string,
      }
    }

    throw response
  } catch (error) {
    console.error(`Failed to post ${description} to Slack:`, error)
    return null
  }
}

export const propagateAssignment = async (assignmentId: string) => {
  const assignment = await getAssignment(assignmentId)

  if (assignment === null) {
    return
  }

  // Skip whatever already made it to Slack, so a retry never posts a duplicate.
  let threadId = assignment.slackId

  if (threadId === null) {
    const posted = await postMessage(`assignment ${assignmentId} (INITIAL)`, {
      channel: assignment.slackChannel,
      text: fillTemplate(
        templates.slackAssignmentInitial,
        assignment,
        siteUrl(),
      ),
    })

    if (posted) {
      // chat.update needs the channel id; slackChannel holds a channel name.
      await updateAssignment(assignmentId, {
        slackId: posted.ts,
        slackChannelId: posted.channel,
      })
      threadId = posted.ts
    }
  }

  if (threadId !== null && assignment.slackThreadId === null) {
    const posted = await postMessage(`assignment ${assignmentId} (THREAD)`, {
      channel: assignment.slackChannel,
      thread_ts: threadId,
      text: fillTemplate(
        templates.slackAssignmentThread,
        assignment,
        siteUrl(),
      ),
    })

    if (posted) {
      await updateAssignment(assignmentId, { slackThreadId: posted.ts })
    }
  }

  // The assignment may have been deleted while the posts above were in flight.
  if ((await getAssignment(assignmentId))?.deleted != null) {
    await propagateAssignmentDeletion(assignmentId)
  }
}

export const propagateAssignmentComments = async (assignmentId: string) => {
  const assignment = await getAssignment(assignmentId)

  if (
    assignment === null ||
    assignment.slackId === null ||
    assignment.deleted !== null
  ) {
    return
  }

  for (const comment of await getAssignmentComments(assignmentId)) {
    if (comment.slackId !== null) {
      continue
    }

    const posted = await postMessage(
      `assignment comment (${assignmentId}, ${comment.id})`,
      {
        channel: assignment.slackChannel,
        thread_ts: assignment.slackId,
        reply_broadcast: 'true',
        text: fillTemplate(
          templates.slackAssignmentComment,
          { comment: comment.comment },
          siteUrl(),
        ),
      },
    )

    if (posted) {
      await setAssignmentCommentSlackId(assignmentId, comment.id, posted.ts)
    }
  }
}

// Errors that will never succeed on a retry, so treat them as done rather than
// letting sync() attempt the same edit on every startup forever.
const TERMINAL_UPDATE_ERRORS = [
  'message_not_found',
  'cant_update_message',
  'channel_not_found',
]

// Returns whether the message no longer needs updating.
const updateMessage = async (channel: string, ts: string, text: string) => {
  try {
    const response = await callSlack('chat.update', { channel, ts, text })

    if (response.ok) {
      return true
    }

    if (response.error && TERMINAL_UPDATE_ERRORS.includes(response.error)) {
      console.error(`Giving up on Slack message ${ts}: ${response.error}`)
      return true
    }

    throw response
  } catch (error) {
    console.error(`Failed to update Slack message ${ts}:`, error)
    return false
  }
}

export const propagateAssignmentDeletion = async (assignmentId: string) => {
  const assignment = await getAssignment(assignmentId)

  if (assignment === null || assignment.deleted === null) {
    return
  }

  const channel = assignment.slackChannelId || assignment.slackChannel
  let done = true

  if (assignment.slackId !== null) {
    done =
      (await updateMessage(
        channel,
        assignment.slackId,
        templates.slackAssignmentDeleted,
      )) && done
  }

  // Assignments posted before slackThreadId existed have no id to update.
  if (assignment.slackThreadId !== null) {
    done =
      (await updateMessage(
        channel,
        assignment.slackThreadId,
        templates.slackAssignmentDeleted,
      )) && done
  }

  for (const comment of await getAssignmentComments(assignmentId)) {
    if (comment.slackId === null) {
      // Still being posted; retry later rather than leaving its text in Slack.
      done = false
      continue
    }

    done =
      (await updateMessage(
        channel,
        comment.slackId,
        templates.slackAssignmentCommentDeleted,
      )) && done
  }

  if (done) {
    await updateAssignment(assignmentId, { slackDeleted: true })
  }
}

// Retries everything that didn't reach Slack, e.g. because of an outage.
export const syncWithSlack = async () => {
  for (const id of await getAssignmentsThatNeedSlackPropagation()) {
    await propagateAssignment(id)
  }

  for (const id of await getAssignmentsThatNeedSlackDeletion()) {
    await propagateAssignmentDeletion(id)
  }
}

export const fetchMemberCount = async () => {
  const response = await callSlack(
    'conversations.info',
    {
      channel: slackEnv().SLACK_MEMBER_COUNT_CHANNEL,
      include_num_members: 'true',
    },
    'GET',
  )

  if (!response.ok) {
    throw response
  }

  return (response.channel as { num_members: number }).num_members
}
