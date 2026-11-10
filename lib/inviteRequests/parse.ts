// Recognises the message Slackbot posts in the invite request channel when a
// member asks to invite someone.
//
// The exact format isn't documented, so the parser is deliberately loose: a
// message from Slackbot that mentions a member and contains at least one e-mail
// address. It has to be checked against real requests before the bot is let
// out of dry-run mode.

export interface SlackMessage {
  type?: string
  subtype?: string
  user?: string
  bot_id?: string
  bot_profile?: { name?: string }
  text?: string
  ts: string
  thread_ts?: string
  blocks?: unknown[]
  attachments?: unknown[]
  reactions?: { name: string; users?: string[] }[]
}

export interface InviteRequest {
  ts: string
  inviterId: string
  invitees: string[]
}

const SLACKBOT_USER_ID = 'USLACKBOT'

const isFromSlackbot = (message: SlackMessage) =>
  message.user === SLACKBOT_USER_ID ||
  message.bot_profile?.name?.toLowerCase() === 'slackbot'

// Gathers every string in the message, since Slack may put the interesting
// parts in text, blocks or attachments.
const collectText = (value: unknown, into: string[] = []) => {
  if (typeof value === 'string') {
    into.push(value)
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, into))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectText(item, into))
  }
  return into
}

const MENTION = /<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export const parseInviteRequest = (
  message: SlackMessage,
): InviteRequest | null => {
  if (!isFromSlackbot(message)) {
    return null
  }

  // Replies in a request's thread, including the bot's own, are not requests.
  if (message.thread_ts && message.thread_ts !== message.ts) {
    return null
  }

  const text = collectText([
    message.text,
    message.blocks,
    message.attachments,
  ]).join('\n')

  const inviterId = text.match(MENTION)?.[1]
  const invitees = [
    ...new Set(
      Array.from(text.matchAll(EMAIL), (match) => match[0].toLowerCase()),
    ),
  ]

  if (!inviterId || invitees.length === 0) {
    return null
  }

  return { ts: message.ts, inviterId, invitees }
}

export const hasReactionFrom = (
  message: SlackMessage,
  reaction: string,
  userId: string,
) =>
  message.reactions?.some(
    (r) => r.name === reaction && r.users?.includes(userId),
  ) ?? false
