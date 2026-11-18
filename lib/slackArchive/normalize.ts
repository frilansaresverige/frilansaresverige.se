// Turns Slack's objects into rows for the archive, and decides what an
// incoming version of a message means for the stored one. No I/O here.

export interface SlackFileObject {
  id: string
  mode?: string
  name?: string
  title?: string
  mimetype?: string
  filetype?: string
  size?: number
  created?: number
  user?: string
  url_private_download?: string
  url_private?: string
  [key: string]: unknown
}

export interface SlackApiMessage {
  ts: string
  type?: string
  subtype?: string
  user?: string
  bot_id?: string
  username?: string
  text?: string
  thread_ts?: string
  reply_count?: number
  latest_reply?: string
  edited?: { user?: string; ts?: string }
  files?: SlackFileObject[]
  [key: string]: unknown
}

// Fields that change all the time without the message changing, or that only
// describe the event that delivered it.
const VOLATILE_FIELDS = [
  'reactions',
  'channel',
  'channel_type',
  'event_ts',
  'reply_users',
  'reply_users_count',
  'latest_reply',
  'last_read',
  'subscribed',
  'is_locked',
]

export const withoutVolatileFields = (message: SlackApiMessage) => {
  const copy: Record<string, unknown> = { ...message }
  for (const field of VOLATILE_FIELDS) {
    delete copy[field]
  }
  return copy as SlackApiMessage
}

export const tsToSeconds = (ts: string) => Math.floor(Number(ts))

// Slack timestamps are seconds and microseconds as a string; compared as
// numbers of microseconds, since floats lose the last digits.
const tsToMicros = (ts: string) => {
  const [seconds = '0', fraction = ''] = ts.split('.')
  return (
    BigInt(seconds) * 1_000_000n +
    BigInt(fraction.padEnd(6, '0').slice(0, 6) || '0')
  )
}

export const compareTs = (a: string, b: string) => {
  const difference = tsToMicros(a) - tsToMicros(b)
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}

// Files worth keeping: not deleted ones, nor those Slack hides on the Free
// plan, which come without any details.
export const archivableFiles = (message: SlackApiMessage) =>
  (message.files ?? []).filter(
    (file) =>
      file.id && file.mode !== 'tombstone' && file.mode !== 'hidden_by_limit',
  )

export const toMessageRow = (
  channelId: string,
  message: SlackApiMessage,
  now: number,
) => {
  const raw = withoutVolatileFields(message)
  const isThread =
    !!message.thread_ts &&
    (message.thread_ts !== message.ts || (message.reply_count ?? 0) > 0)

  return {
    channelId,
    ts: message.ts,
    threadTs: isThread ? message.thread_ts! : null,
    userId: message.user ?? null,
    botId: message.bot_id ?? null,
    username: message.username ?? null,
    subtype: message.subtype ?? null,
    text: message.text ?? '',
    posted: tsToSeconds(message.ts),
    edited: message.edited?.ts ?? null,
    replyCount: message.reply_count ?? 0,
    deleted: null,
    updated: now,
    raw,
  }
}

export type MessageRow = ReturnType<typeof toMessageRow>

interface StoredMessage {
  text: string
  edited: string | null
  deleted: number | null
  raw: unknown
}

const fileIds = (raw: unknown) =>
  ((raw as SlackApiMessage | null)?.files ?? [])
    .map((file) => file.id)
    .sort()
    .join(',')

export type MessageChange =
  // Not stored yet.
  | 'insert'
  // Its text or files changed: keep the stored version as a revision.
  | 'revise'
  // Same content, other details (e.g. the number of replies): just update.
  | 'refresh'
  // Older than what's stored, or the message has been deleted.
  | 'ignore'

export const decideChange = (
  stored: StoredMessage | null,
  incoming: MessageRow,
): MessageChange => {
  if (stored === null) {
    return 'insert'
  }

  if (stored.deleted !== null) {
    return 'ignore'
  }

  const contentChanged =
    stored.text !== incoming.text ||
    fileIds(stored.raw) !== fileIds(incoming.raw)

  if (!contentChanged) {
    return 'refresh'
  }

  // A fetch that started before an edit can deliver the older version after
  // the edit's event; Slack's edited.ts tells which is newer.
  if (
    stored.edited !== null &&
    (incoming.edited === null || compareTs(incoming.edited, stored.edited) < 0)
  ) {
    return 'ignore'
  }

  return 'revise'
}

interface SlackConversation {
  id: string
  name: string
  topic?: { value?: string }
  purpose?: { value?: string }
  created?: number
  creator?: string
  num_members?: number
  is_archived?: boolean
  is_member?: boolean
  [key: string]: unknown
}

export const toChannelRow = (channel: SlackConversation, now: number) => ({
  id: channel.id,
  name: channel.name,
  topic: channel.topic?.value || null,
  purpose: channel.purpose?.value || null,
  created: channel.created ?? 0,
  creatorId: channel.creator ?? null,
  memberCount: channel.num_members ?? null,
  isArchived: !!channel.is_archived,
  isMember: !!channel.is_member,
  updated: now,
  raw: channel,
})

interface SlackUserObject {
  id: string
  name?: string
  real_name?: string
  tz?: string
  is_bot?: boolean
  deleted?: boolean
  profile?: {
    real_name?: string
    display_name?: string
    title?: string
    image_192?: string
    image_72?: string
  }
  [key: string]: unknown
}

export const toUserRow = (user: SlackUserObject, now: number) => ({
  id: user.id,
  name: user.name ?? user.id,
  realName: user.real_name || user.profile?.real_name || null,
  displayName: user.profile?.display_name || null,
  title: user.profile?.title || null,
  avatarUrl: user.profile?.image_192 || user.profile?.image_72 || null,
  timezone: user.tz ?? null,
  isBot: !!user.is_bot,
  isDeleted: !!user.deleted,
  updated: now,
  raw: user,
})

export const toFileRow = (
  channelId: string,
  messageTs: string,
  file: SlackFileObject,
  now: number,
) => ({
  id: file.id,
  channelId,
  messageTs,
  userId: file.user ?? null,
  name: file.name ?? null,
  title: file.title ?? null,
  mimetype: file.mimetype ?? null,
  filetype: file.filetype ?? null,
  size: file.size ?? null,
  created: file.created ?? null,
  updated: now,
  raw: file,
})

// A file name that's safe on disk and still recognisable.
export const safeFileName = (name: string | null | undefined, id: string) => {
  const cleaned = (name ?? '')
    .normalize('NFC')
    .replace(/[/\\\0-\x1f\x7f]/g, '_')
    .replace(/^\.+/, '_')
    .trim()
    .slice(0, 200)
  return cleaned || id
}
