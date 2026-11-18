import 'server-only'

import { slackArchiveEnv } from '@/lib/env'
import { callSlack, callSlackOrThrow } from '@/lib/slackApi'

import { downloadPendingFiles } from './files'
import { compareTs, type SlackApiMessage } from './normalize'
import {
  channelsToBackfill,
  latestStoredReply,
  markChannelBackfilled,
  markChannelDeleted,
  memberChannels,
  saveChannel,
  saveMessage,
  saveUser,
  setChannelMembership,
} from './store'

type Conversation = Parameters<typeof saveChannel>[0]

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000
const FILES_INTERVAL_MS = 10 * 60 * 1000
// How far back each sync looks for messages and replies that no event brought,
// e.g. while the server was being deployed.
const CATCH_UP_SECONDS = 7 * 24 * 60 * 60

// Pages through a Web API method that uses cursors.
const listAll = async <T>(
  method: string,
  key: string,
  params: Record<string, string>,
) => {
  const items: T[] = []
  let cursor: string | undefined

  do {
    const response = await callSlackOrThrow(
      method,
      { limit: '200', ...params, cursor },
      'GET',
    )
    items.push(...((response[key] as T[]) ?? []))
    cursor = (response.response_metadata as { next_cursor?: string })
      ?.next_cursor
  } while (cursor)

  return items
}

export const joinChannel = async (channelId: string) => {
  const response = await callSlackOrThrow('conversations.join', {
    channel: channelId,
  })
  await saveChannel({ ...(response.channel as Conversation), is_member: true })
}

// Fetches one channel's details, e.g. after it was renamed or the bot was
// added to it. Returns whether the bot is a member.
export const refreshChannel = async (channelId: string) => {
  const response = await callSlack(
    'conversations.info',
    { channel: channelId },
    'GET',
  )

  if (!response.ok) {
    if (response.error === 'channel_not_found') {
      await markChannelDeleted(channelId)
      return false
    }
    throw new Error(`conversations.info failed: ${response.error}`)
  }

  const channel = response.channel as Conversation & { is_private?: boolean }
  if (channel.is_private) {
    return false
  }

  await saveChannel(channel)
  return !!channel.is_member
}

export const syncChannels = async () => {
  const joinAll = slackArchiveEnv().SLACK_ARCHIVE_JOIN_ALL
  const channels = await listAll<Conversation>(
    'conversations.list',
    'channels',
    {
      types: 'public_channel',
      exclude_archived: 'false',
    },
  )

  for (const channel of channels) {
    if (joinAll && !channel.is_member && !channel.is_archived) {
      await joinChannel(channel.id)
    } else {
      await saveChannel(channel)
    }
  }
}

export const syncUsers = async () => {
  const users = await listAll<Parameters<typeof saveUser>[0]>(
    'users.list',
    'members',
    {},
  )
  for (const user of users) {
    await saveUser(user)
  }
  return users.length
}

const isThreadStart = (message: SlackApiMessage) =>
  (message.reply_count ?? 0) > 0 && message.thread_ts === message.ts

// Stores a channel's messages from `oldest` on (all Slack still has, by
// default). Replies are fetched for threads where they're missing.
const fetchHistory = async (
  channelId: string,
  oldest?: string,
  { onlyNewReplies }: { onlyNewReplies: boolean } = { onlyNewReplies: false },
) => {
  let count = 0
  let cursor: string | undefined

  do {
    const response = await callSlack(
      'conversations.history',
      { channel: channelId, limit: '200', oldest, cursor },
      'GET',
    )

    if (!response.ok) {
      if (response.error === 'not_in_channel') {
        await setChannelMembership(channelId, false)
        return count
      }
      if (response.error === 'channel_not_found') {
        await markChannelDeleted(channelId)
        return count
      }
      throw new Error(`conversations.history failed: ${response.error}`)
    }

    for (const message of response.messages as SlackApiMessage[]) {
      await saveMessage(channelId, message)
      count++

      if (isThreadStart(message)) {
        const stored = onlyNewReplies
          ? await latestStoredReply(channelId, message.ts)
          : null
        if (
          !onlyNewReplies ||
          !stored ||
          !message.latest_reply ||
          compareTs(message.latest_reply, stored) > 0
        ) {
          count += await fetchThread(channelId, message.ts)
        }
      }
    }

    cursor = (response.response_metadata as { next_cursor?: string })
      ?.next_cursor
  } while (cursor)

  return count
}

export const fetchThread = async (channelId: string, threadTs: string) => {
  const replies = await listAll<SlackApiMessage>(
    'conversations.replies',
    'messages',
    { channel: channelId, ts: threadTs },
  )
  let count = 0
  for (const reply of replies) {
    if (reply.ts !== threadTs) {
      await saveMessage(channelId, reply)
      count++
    }
  }
  return count
}

// Everything Slack still has for a channel the bot has just joined: on the
// Free plan, the last 90 days.
export const backfillChannel = async (channel: {
  id: string
  name: string
}) => {
  const count = await fetchHistory(channel.id)
  await markChannelBackfilled(channel.id)
  console.log(`Archived ${count} message(s) from #${channel.name}.`)
}

const catchUp = async () => {
  const oldest = String(Math.floor(Date.now() / 1000) - CATCH_UP_SECONDS)

  for (const channel of await memberChannels()) {
    try {
      await fetchHistory(channel.id, oldest, { onlyNewReplies: true })
    } catch (error) {
      console.error(`Failed to catch up on #${channel.name}:`, error)
    }
  }
}

let running = false

export const runArchiveSync = async () => {
  if (running) {
    return
  }
  running = true

  try {
    await syncChannels()
    const users = await syncUsers()

    const pending = await channelsToBackfill()
    if (pending.length > 0) {
      console.log(
        `Slack archive: ${users} users; fetching history for ${pending.length} channel(s).`,
      )
    }
    for (const channel of pending) {
      try {
        await backfillChannel(channel)
      } catch (error) {
        console.error(`Failed to fetch the history of #${channel.name}:`, error)
      }
    }

    await catchUp()
  } finally {
    running = false
  }

  void downloadPendingFiles()
}

export const startSlackArchive = () => {
  const sync = () =>
    runArchiveSync().catch((error) => {
      console.error('Slack archive sync failed:', error)
    })
  const files = () =>
    downloadPendingFiles().catch((error) => {
      console.error('Downloading Slack files failed:', error)
    })

  void sync()
  setInterval(sync, SYNC_INTERVAL_MS)
  setInterval(files, FILES_INTERVAL_MS)
}
