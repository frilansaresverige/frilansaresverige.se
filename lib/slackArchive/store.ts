import 'server-only'

import { and, eq, isNull, lt, max, sql } from 'drizzle-orm'

import { getTimestamp } from '@/lib/assignments'
import { db } from '@/lib/db'
import {
  slackChannel,
  slackFile,
  slackMessage,
  slackMessageRevision,
  slackUser,
} from '@/lib/db/schema'

import {
  archivableFiles,
  decideChange,
  toChannelRow,
  toFileRow,
  toMessageRow,
  toUserRow,
  type MessageChange,
  type SlackApiMessage,
} from './normalize'

type Transaction = Parameters<
  Parameters<ReturnType<typeof db>['transaction']>[0]
>[0]

const markDeletedIn = async (
  tx: Transaction,
  channelId: string,
  ts: string,
  now: number,
) => {
  const [stored] = await tx
    .select()
    .from(slackMessage)
    .where(and(eq(slackMessage.channelId, channelId), eq(slackMessage.ts, ts)))
    .for('update')

  if (!stored || stored.deleted !== null) {
    return false
  }

  await tx.insert(slackMessageRevision).values({
    channelId,
    ts,
    reason: 'deleted',
    replaced: now,
    text: stored.text,
    edited: stored.edited,
    raw: stored.raw,
  })
  await tx
    .update(slackMessage)
    .set({ deleted: now, text: '', raw: null, updated: now })
    .where(and(eq(slackMessage.channelId, channelId), eq(slackMessage.ts, ts)))

  return true
}

// An event and a fetch can store the same message at the same moment; one of
// them then hits a duplicate key or a deadlock, and simply tries again.
const RETRYABLE_ERRORS = [
  'ER_DUP_ENTRY',
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
]

const withRetries = async <T>(task: () => Promise<T>) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await task()
    } catch (error) {
      const code =
        (error as { code?: string; cause?: { code?: string } }).cause?.code ??
        (error as { code?: string }).code
      if (attempt >= 3 || !code || !RETRYABLE_ERRORS.includes(code)) {
        throw error
      }
    }
  }
}

// Stores a message as Slack describes it now, keeping the previous version
// as a revision when its content changed. Safe to call again with the same
// message, so events, retries and fetches may overlap.
export const saveMessage = (channelId: string, message: SlackApiMessage) =>
  withRetries(() => saveMessageOnce(channelId, message))

const saveMessageOnce = async (
  channelId: string,
  message: SlackApiMessage,
): Promise<MessageChange> => {
  const now = getTimestamp()
  const row = toMessageRow(channelId, message, now)

  const change = await db().transaction(async (tx) => {
    const [stored] = await tx
      .select()
      .from(slackMessage)
      .where(
        and(
          eq(slackMessage.channelId, channelId),
          eq(slackMessage.ts, message.ts),
        ),
      )
      .for('update')

    // Deleting a thread's first message leaves a placeholder in its place.
    if (message.subtype === 'tombstone') {
      if (stored) {
        await markDeletedIn(tx, channelId, message.ts, now)
      }
      return 'ignore' as const
    }

    const change = decideChange(stored ?? null, row)

    if (change === 'insert') {
      await tx.insert(slackMessage).values(row)
    } else if (change === 'revise') {
      await tx.insert(slackMessageRevision).values({
        channelId,
        ts: message.ts,
        reason: 'edited',
        replaced: now,
        text: stored!.text,
        edited: stored!.edited,
        raw: stored!.raw,
      })
      await tx
        .update(slackMessage)
        .set(row)
        .where(
          and(
            eq(slackMessage.channelId, channelId),
            eq(slackMessage.ts, message.ts),
          ),
        )
    } else if (change === 'refresh') {
      await tx
        .update(slackMessage)
        .set({
          threadTs: row.threadTs,
          replyCount: row.replyCount,
          edited: row.edited,
          raw: row.raw,
          updated: now,
        })
        .where(
          and(
            eq(slackMessage.channelId, channelId),
            eq(slackMessage.ts, message.ts),
          ),
        )
    }

    return change
  })

  if (change === 'insert' || change === 'revise') {
    await saveFiles(channelId, message)
  }

  return change
}

export const markMessageDeleted = (channelId: string, ts: string) =>
  withRetries(() =>
    db().transaction((tx) => markDeletedIn(tx, channelId, ts, getTimestamp())),
  )

// The newest reply stored for a thread, to tell whether replies are missing.
export const latestStoredReply = async (channelId: string, threadTs: string) =>
  (
    await db()
      .select({ ts: max(slackMessage.ts) })
      .from(slackMessage)
      .where(
        and(
          eq(slackMessage.channelId, channelId),
          eq(slackMessage.threadTs, threadTs),
        ),
      )
  )[0]?.ts ?? null

const saveFiles = async (channelId: string, message: SlackApiMessage) => {
  const now = getTimestamp()

  for (const file of archivableFiles(message)) {
    const row = toFileRow(channelId, message.ts, file, now)
    // A file shared again keeps the message it was first seen in.
    await db()
      .insert(slackFile)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          title: row.title,
          mimetype: row.mimetype,
          filetype: row.filetype,
          size: row.size,
          raw: row.raw,
          updated: now,
        },
      })
  }
}

export const saveChannel = async (
  channel: Parameters<typeof toChannelRow>[0],
) => {
  const row = toChannelRow(channel, getTimestamp())
  const changes: Partial<typeof row> = { ...row }
  delete changes.id
  await db()
    .insert(slackChannel)
    .values(row)
    .onDuplicateKeyUpdate({ set: { ...changes, deleted: null } })
}

export const markChannelDeleted = (channelId: string) =>
  db()
    .update(slackChannel)
    .set({ deleted: getTimestamp(), isMember: false, updated: getTimestamp() })
    .where(eq(slackChannel.id, channelId))

export const setChannelMembership = (channelId: string, isMember: boolean) =>
  db()
    .update(slackChannel)
    .set({ isMember, updated: getTimestamp() })
    .where(eq(slackChannel.id, channelId))

export const markChannelBackfilled = (channelId: string) =>
  db()
    .update(slackChannel)
    .set({ backfilled: getTimestamp() })
    .where(eq(slackChannel.id, channelId))

export const channelsToBackfill = () =>
  db()
    .select({ id: slackChannel.id, name: slackChannel.name })
    .from(slackChannel)
    .where(
      and(
        eq(slackChannel.isMember, true),
        isNull(slackChannel.backfilled),
        isNull(slackChannel.deleted),
      ),
    )

export const memberChannels = () =>
  db()
    .select({ id: slackChannel.id, name: slackChannel.name })
    .from(slackChannel)
    .where(and(eq(slackChannel.isMember, true), isNull(slackChannel.deleted)))

export const isArchivedChannel = async (channelId: string) => {
  const [row] = await db()
    .select({ isMember: slackChannel.isMember })
    .from(slackChannel)
    .where(eq(slackChannel.id, channelId))
  return row?.isMember ?? false
}

export const saveUser = async (user: Parameters<typeof toUserRow>[0]) => {
  const row = toUserRow(user, getTimestamp())
  const changes: Partial<typeof row> = { ...row }
  delete changes.id
  await db()
    .insert(slackUser)
    .values(row)
    .onDuplicateKeyUpdate({ set: changes })
}

export const MAX_DOWNLOAD_ATTEMPTS = 5

export const filesToDownload = (limit: number) =>
  db()
    .select()
    .from(slackFile)
    .where(
      and(
        isNull(slackFile.downloaded),
        lt(slackFile.attempts, MAX_DOWNLOAD_ATTEMPTS),
      ),
    )
    .orderBy(slackFile.attempts, slackFile.created)
    .limit(limit)

export const markFileDownloaded = (id: string, path: string) =>
  db()
    .update(slackFile)
    .set({
      path,
      downloaded: getTimestamp(),
      lastError: null,
      updated: getTimestamp(),
    })
    .where(eq(slackFile.id, id))

export const markFileFailed = (id: string, error: string) =>
  db()
    .update(slackFile)
    .set({
      attempts: sql`${slackFile.attempts} + 1`,
      lastError: error.slice(0, 1000),
      updated: getTimestamp(),
    })
    .where(eq(slackFile.id, id))

// For files there's nothing to download for: not tried again.
export const markFileSkipped = (id: string, reason: string) =>
  db()
    .update(slackFile)
    .set({
      attempts: MAX_DOWNLOAD_ATTEMPTS,
      lastError: reason.slice(0, 1000),
      updated: getTimestamp(),
    })
    .where(eq(slackFile.id, id))

export const updateFileRaw = (id: string, raw: unknown) =>
  db()
    .update(slackFile)
    .set({ raw, updated: getTimestamp() })
    .where(eq(slackFile.id, id))
