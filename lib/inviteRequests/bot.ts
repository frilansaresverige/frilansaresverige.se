import 'server-only'

import {
  inviteRequestEnv,
  isInviteRequestBotConfigured,
  siteUrl,
  templateEditors,
} from '@/lib/env'
import { callSlack, callSlackOrThrow } from '@/lib/slackApi'

import {
  hasReactionFrom,
  hasReactionsFromOthers,
  parseInviteRequest,
  type InviteRequest,
  type SlackMessage,
} from './parse'
import { buildHomeView } from './homeView'
import { getRejectionTemplate, getRejectionTemplateBody } from './store'
import { DEFAULT_REJECTION_TEMPLATE, renderRejection } from './template'
import { buildTemplateModal } from './templateModal'

// Added to a request once it has been handled. It doubles as the marker the
// sweep uses to skip requests, so no state is kept anywhere else.
const HANDLED_REACTION = 'envelope_with_arrow'
const SWEEP_INTERVAL_MS = 60 * 60 * 1000
// Only recent requests are swept, so that requests the admins have long since
// dealt with don't trigger messages after an outage.
const SWEEP_WINDOW_SECONDS = 24 * 60 * 60

export const applicationUrl = () => `${siteUrl()}/ansokan`

let botUserId: Promise<string> | null = null

const getBotUserId = () =>
  (botUserId ??= callSlackOrThrow('auth.test', {})
    .then((response) => response.user_id as string)
    .catch((error) => {
      botUserId = null
      throw error
    }))

let channelId: Promise<string> | null = null

// The channel can be configured by name, which has to be looked up once.
const getChannelId = () =>
  (channelId ??= (async () => {
    const configured = inviteRequestEnv().SLACK_INVITE_REQUEST_CHANNEL

    if (/^[CG][A-Z0-9]{6,}$/.test(configured)) {
      return configured
    }

    let cursor: string | undefined
    do {
      const response = await callSlackOrThrow(
        'conversations.list',
        {
          types: 'private_channel,public_channel',
          exclude_archived: 'true',
          limit: '200',
          cursor,
        },
        'GET',
      )
      const channels = response.channels as { id: string; name: string }[]
      const match = channels.find((channel) => channel.name === configured)

      if (match) {
        return match.id
      }

      cursor = (response.response_metadata as { next_cursor?: string })
        ?.next_cursor
    } while (cursor)

    throw new Error(
      `Invite request channel #${configured} not found; is the bot a member?`,
    )
  })().catch((error) => {
    channelId = null
    throw error
  }))

// Requests being handled right now, so that an event and the sweep (or a
// retried event) arriving together don't both send a message.
const inFlight = new Set<string>()

const handleRequest = async (channel: string, request: InviteRequest) => {
  const message = renderRejection(await getRejectionTemplateBody(), {
    ...request,
    applicationUrl: applicationUrl(),
  })

  if (inviteRequestEnv().INVITE_REQUEST_DRY_RUN) {
    await callSlackOrThrow('chat.postMessage', {
      channel,
      thread_ts: request.ts,
      text:
        `:test_tube: *Testläge:* Jag skulle ha skickat det här till <@${request.inviterId}> ` +
        `(inbjudna: ${request.invitees.join(', ')}):\n\n>>> ${message}`,
      unfurl_links: 'false',
    })
  } else {
    // Posting to a user id delivers the message in the app's DM with them.
    await callSlackOrThrow('chat.postMessage', {
      channel: request.inviterId,
      text: message,
      unfurl_links: 'false',
    })
    await callSlackOrThrow('chat.postMessage', {
      channel,
      thread_ts: request.ts,
      text: `Jag har hänvisat <@${request.inviterId}> till ansökningsformuläret. Inbjudan kan nekas.`,
    })
  }

  const reaction = await callSlack('reactions.add', {
    channel,
    timestamp: request.ts,
    name: HANDLED_REACTION,
  })
  if (!reaction.ok && reaction.error !== 'already_reacted') {
    throw new Error(`Slack reactions.add failed: ${reaction.error}`)
  }
}

// Handles a message from the channel if it's an invite request that hasn't
// been dealt with yet. Returns whether it did.
export const handleMessage = async (channel: string, message: SlackMessage) => {
  // Until the channel is configured, the app's other features still work.
  if (!isInviteRequestBotConfigured() || channel !== (await getChannelId())) {
    return false
  }

  const request = parseInviteRequest(message)

  if (request === null || inFlight.has(request.ts)) {
    return false
  }

  // Handled already, or an admin is already on it.
  const botUserId = await getBotUserId()
  if (
    hasReactionFrom(message, HANDLED_REACTION, botUserId) ||
    hasReactionsFromOthers(message, botUserId)
  ) {
    return false
  }

  inFlight.add(request.ts)
  try {
    await handleRequest(channel, request)
    return true
  } finally {
    inFlight.delete(request.ts)
  }
}

// Catches requests whose event never arrived, e.g. during a deploy.
export const sweepInviteRequests = async () => {
  const channel = await getChannelId()
  const oldest = String(Math.floor(Date.now() / 1000) - SWEEP_WINDOW_SECONDS)
  let cursor: string | undefined
  let handled = 0

  do {
    const response = await callSlackOrThrow(
      'conversations.history',
      { channel, oldest, limit: '200', cursor },
      'GET',
    )

    for (const message of response.messages as SlackMessage[]) {
      try {
        if (await handleMessage(channel, message)) {
          handled++
        }
      } catch (error) {
        console.error(`Failed to handle invite request ${message.ts}:`, error)
      }
    }

    cursor = (response.response_metadata as { next_cursor?: string })
      ?.next_cursor
  } while (cursor)

  if (handled > 0) {
    console.log(`Invite request sweep handled ${handled} request(s).`)
  }
}

export const startInviteRequestSweep = () => {
  const sweep = () =>
    sweepInviteRequests().catch((error) => {
      console.error('Invite request sweep failed:', error)
    })

  void sweep()
  setInterval(sweep, SWEEP_INTERVAL_MS)
}

// Workspace admins and owners, plus anyone in SLACK_TEMPLATE_EDITORS.
export const canEditTemplate = async (userId: string) =>
  templateEditors().includes(userId) || (await isWorkspaceAdmin(userId))

const isWorkspaceAdmin = async (userId: string) => {
  const response = await callSlack('users.info', { user: userId }, 'GET')
  const user = response.user as
    { is_admin?: boolean; is_owner?: boolean } | undefined

  return response.ok && !!(user?.is_admin || user?.is_owner)
}

// Draws the Home tab for one person; admins get the template editor.
export const publishHome = async (userId: string) => {
  const isAdmin = await canEditTemplate(userId)
  const current = isAdmin ? await getRejectionTemplate() : null

  await callSlackOrThrow('views.publish', {
    user_id: userId,
    view: JSON.stringify(
      buildHomeView({
        isAdmin,
        template: current?.body ?? DEFAULT_REJECTION_TEMPLATE,
        current,
      }),
    ),
  })
}

// Slack only accepts a trigger id for three seconds, so call this before
// responding to the request that carried it.
export const openTemplateModal = async (triggerId: string) =>
  callSlackOrThrow('views.open', {
    trigger_id: triggerId,
    view: JSON.stringify(buildTemplateModal(await getRejectionTemplate())),
  })
