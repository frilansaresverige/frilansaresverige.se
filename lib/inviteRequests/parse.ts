// Recognises the message Slackbot posts in the invite request channel when a
// member asks to invite someone. As observed in November 2026:
//
//   text:        "<@U…> requested to invite one person to this workspace."
//   attachments: "*Email*: <mailto:a@b.se|a@b.se>"
//                "*Reason for Request*: …" (optional, free text)
//                "*Channels:* …" (optional)
//                Slack's own "Send Invitation" / "Deny" buttons, with a
//                callback_id starting with "inviterequests"
//
// Once an admin has acted, Slack replaces the buttons with a line such as
// ":no_entry_sign: <@U…> denied this request." So a request counts as open
// only while its Deny button is there; anything unexpected is left alone.

interface Attachment {
  text?: string
  callback_id?: string
  actions?: { name?: string }[]
}

export interface SlackMessage {
  type?: string
  subtype?: string
  user?: string
  bot_id?: string
  text?: string
  ts: string
  thread_ts?: string
  blocks?: unknown[]
  attachments?: Attachment[]
  reactions?: { name: string; users?: string[] }[]
}

export interface InviteRequest {
  ts: string
  inviterId: string
  invitees: string[]
}

const SLACKBOT_USER_ID = 'USLACKBOT'
const INVITER = /^<@([UW][A-Z0-9]+)(?:\|[^>]*)?> requested to invite\b/
const MAILTO = /<mailto:([^|>]+)(?:\|[^>]*)?>/g

const isOpen = (attachments: Attachment[]) =>
  attachments.some(
    (attachment) =>
      attachment.callback_id?.startsWith('inviterequests') &&
      attachment.actions?.some((action) => action.name === 'deny'),
  )

export const parseInviteRequest = (
  message: SlackMessage,
): InviteRequest | null => {
  if (message.user !== SLACKBOT_USER_ID || message.subtype) {
    return null
  }

  // Replies in a request's thread, including the bot's own, are not requests.
  if (message.thread_ts && message.thread_ts !== message.ts) {
    return null
  }

  const attachments = message.attachments ?? []
  const inviterId = message.text?.match(INVITER)?.[1]

  if (!inviterId || !isOpen(attachments)) {
    return null
  }

  // Addresses only from the e-mail attachment, never from the free-text reason.
  const invitees = [
    ...new Set(
      attachments
        .filter((attachment) => attachment.text?.startsWith('*Email'))
        .flatMap((attachment) =>
          Array.from(attachment.text!.matchAll(MAILTO), (match) =>
            match[1]!.trim().toLowerCase(),
          ),
        ),
    ),
  ]

  if (invitees.length === 0) {
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

// An admin reacting (e.g. with :eyes:) means someone is already on it.
export const hasReactionsFromOthers = (message: SlackMessage, userId: string) =>
  message.reactions?.some((r) =>
    r.users?.some((reactor) => reactor !== userId),
  ) ?? false
