import 'server-only'

import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  slackChannel,
  slackFile,
  slackMessage,
  slackUser,
} from '@/lib/db/schema'
import { isSlackLoginConfigured } from '@/lib/env'

import { parseSearchTerms } from './searchTerms'

export const PAGE_SIZE = 25

// Join and leave notices and the like aren't worth finding.
const NOISE_SUBTYPES = [
  'channel_join',
  'channel_leave',
  'channel_topic',
  'channel_purpose',
  'channel_name',
  'bot_add',
  'bot_remove',
]

// The signed-in member, or null. Someone deactivated in Slack since signing in
// loses access too.
export const getMember = async () => {
  if (!isSlackLoginConfigured()) {
    return null
  }

  const session = await getSession()
  if (!session) {
    return null
  }

  const [user] = await db()
    .select({ isDeleted: slackUser.isDeleted })
    .from(slackUser)
    .where(eq(slackUser.id, session.userId))

  return user?.isDeleted ? null : session
}

const escapeLike = (term: string) => term.replace(/[\\%_]/g, (c) => `\\${c}`)

const messageColumns = {
  channelId: slackMessage.channelId,
  ts: slackMessage.ts,
  threadTs: slackMessage.threadTs,
  userId: slackMessage.userId,
  username: slackMessage.username,
  text: slackMessage.text,
  posted: slackMessage.posted,
  edited: slackMessage.edited,
  replyCount: slackMessage.replyCount,
  channelName: slackChannel.name,
  authorName: sql<
    string | null
  >`COALESCE(NULLIF(${slackUser.displayName}, ''), ${slackUser.realName}, ${slackUser.name}, ${slackMessage.username})`,
  avatarUrl: slackUser.avatarUrl,
}

export type ArchivedMessage = Awaited<
  ReturnType<typeof searchMessages>
>['messages'][number] & {
  files: {
    id: string
    name: string | null
    title: string | null
    mimetype: string | null
    downloaded: boolean
  }[]
}

const withFiles = async <T extends { channelId: string; ts: string }>(
  messages: T[],
) => {
  if (messages.length === 0) {
    return []
  }

  const files = await db()
    .select({
      id: slackFile.id,
      channelId: slackFile.channelId,
      messageTs: slackFile.messageTs,
      name: slackFile.name,
      title: slackFile.title,
      mimetype: slackFile.mimetype,
      downloaded: slackFile.downloaded,
    })
    .from(slackFile)
    .where(
      or(
        ...messages.map((m) =>
          and(
            eq(slackFile.channelId, m.channelId),
            eq(slackFile.messageTs, m.ts),
          ),
        ),
      ),
    )

  return messages.map((message) => ({
    ...message,
    files: files
      .filter(
        (f) => f.channelId === message.channelId && f.messageTs === message.ts,
      )
      .map((f) => ({ ...f, downloaded: f.downloaded !== null })),
  }))
}

export const searchMessages = async ({
  query,
  channelId,
  page,
}: {
  query: string
  channelId?: string
  page: number
}) => {
  const terms = parseSearchTerms(query)

  if (terms.length === 0) {
    return { terms, messages: [], hasMore: false }
  }

  const rows = await db()
    .select(messageColumns)
    .from(slackMessage)
    .leftJoin(slackChannel, eq(slackChannel.id, slackMessage.channelId))
    .leftJoin(slackUser, eq(slackUser.id, slackMessage.userId))
    .where(
      and(
        isNull(slackMessage.deleted),
        or(
          isNull(slackMessage.subtype),
          sql`${slackMessage.subtype} NOT IN (${sql.join(
            NOISE_SUBTYPES.map((s) => sql`${s}`),
            sql`, `,
          )})`,
        ),
        channelId ? eq(slackMessage.channelId, channelId) : undefined,
        ...terms.map((term) =>
          like(slackMessage.text, `%${escapeLike(term)}%`),
        ),
      ),
    )
    .orderBy(desc(slackMessage.posted), desc(slackMessage.ts))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE)

  return {
    terms,
    messages: await withFiles(rows.slice(0, PAGE_SIZE)),
    hasMore: rows.length > PAGE_SIZE,
  }
}

// A message and, if it starts or belongs to a thread, the whole thread.
export const getThread = async (channelId: string, ts: string) => {
  const [message] = await db()
    .select({ threadTs: slackMessage.threadTs })
    .from(slackMessage)
    .where(and(eq(slackMessage.channelId, channelId), eq(slackMessage.ts, ts)))

  if (!message) {
    return null
  }

  const threadTs = message.threadTs ?? ts

  const rows = await db()
    .select({ ...messageColumns, deleted: slackMessage.deleted })
    .from(slackMessage)
    .leftJoin(slackChannel, eq(slackChannel.id, slackMessage.channelId))
    .leftJoin(slackUser, eq(slackUser.id, slackMessage.userId))
    .where(
      and(
        eq(slackMessage.channelId, channelId),
        message.threadTs
          ? or(
              eq(slackMessage.threadTs, threadTs),
              eq(slackMessage.ts, threadTs),
            )
          : eq(slackMessage.ts, ts),
      ),
    )
    .orderBy(asc(slackMessage.ts))

  return { threadTs, messages: await withFiles(rows) }
}

export const archivedChannels = () =>
  db()
    .select({ id: slackChannel.id, name: slackChannel.name })
    .from(slackChannel)
    .where(
      sql`EXISTS (SELECT 1 FROM ${slackMessage} WHERE ${slackMessage.channelId} = ${slackChannel.id})`,
    )
    .orderBy(asc(slackChannel.name))

// Names for the people and channels mentioned in messages (<@U…>, <#C…>).
export const mentionNames = async (texts: string[]) => {
  const userIds = new Set<string>()
  const channelIds = new Set<string>()

  for (const text of texts) {
    for (const [, id] of text.matchAll(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g)) {
      userIds.add(id!)
    }
    for (const [, id] of text.matchAll(/<#(C[A-Z0-9]+)(?:\|[^>]*)?>/g)) {
      channelIds.add(id!)
    }
  }

  const [users, channels] = await Promise.all([
    userIds.size
      ? db()
          .select({
            id: slackUser.id,
            name: sql<string>`COALESCE(NULLIF(${slackUser.displayName}, ''), ${slackUser.realName}, ${slackUser.name})`,
          })
          .from(slackUser)
          .where(inArray(slackUser.id, [...userIds]))
      : [],
    channelIds.size
      ? db()
          .select({ id: slackChannel.id, name: slackChannel.name })
          .from(slackChannel)
          .where(inArray(slackChannel.id, [...channelIds]))
      : [],
  ])

  return {
    users: Object.fromEntries(users.map((u) => [u.id, u.name])),
    channels: Object.fromEntries(channels.map((c) => [c.id, c.name])),
  }
}

export const getArchivedFile = async (id: string) => {
  const [file] = await db()
    .select({
      id: slackFile.id,
      name: slackFile.name,
      mimetype: slackFile.mimetype,
      path: slackFile.path,
    })
    .from(slackFile)
    .where(eq(slackFile.id, id))
  return file ?? null
}
