import 'server-only'

import { getBotUserId } from '@/lib/slackApi'

import { downloadPendingFiles } from './files'
import type { SlackApiMessage } from './normalize'
import {
  isArchivedChannel,
  markChannelDeleted,
  markMessageDeleted,
  saveMessage,
  saveUser,
  setChannelMembership,
} from './store'
import {
  backfillChannel,
  joinChannel,
  refreshChannel,
  runArchiveSync,
} from './sync'

export interface SlackEvent {
  type: string
  subtype?: string
  channel?: string | { id: string; name?: string }
  channel_type?: string
  user?: string | Parameters<typeof saveUser>[0]
  message?: SlackApiMessage
  previous_message?: SlackApiMessage
  deleted_ts?: string
  ts?: string
  [key: string]: unknown
}

const channelIdOf = (event: SlackEvent) =>
  typeof event.channel === 'string' ? event.channel : event.channel?.id

// Whether messages in the channel are archived. A channel the bot was added
// to since the last sync isn't known yet, so it's looked up, and its history
// fetched in the background.
const shouldArchive = async (channelId: string) => {
  if (await isArchivedChannel(channelId)) {
    return true
  }
  if (await refreshChannel(channelId)) {
    void runArchiveSync().catch((error) => {
      console.error('Slack archive sync failed:', error)
    })
    return true
  }
  return false
}

// Messages in public channels, and the events that keep channels and users
// up to date. Private channels and DMs are never archived.
export const handleArchiveEvent = async (event: SlackEvent) => {
  const channelId = channelIdOf(event)

  switch (event.type) {
    case 'message': {
      if (event.channel_type !== 'channel' || !channelId) {
        return
      }
      if (!(await shouldArchive(channelId))) {
        return
      }

      if (event.subtype === 'message_deleted' && event.deleted_ts) {
        await markMessageDeleted(channelId, event.deleted_ts)
      } else if (
        (event.subtype === 'message_changed' ||
          event.subtype === 'message_replied') &&
        event.message
      ) {
        await saveMessage(channelId, event.message)
      } else if (event.ts) {
        await saveMessage(channelId, event as SlackApiMessage)
      }

      const files = (event.message ?? event).files
      if (Array.isArray(files) && files.length > 0) {
        void downloadPendingFiles()
      }
      return
    }

    case 'channel_created':
      if (channelId) {
        await joinChannel(channelId)
        await backfillChannel({
          id: channelId,
          name:
            (typeof event.channel === 'object' && event.channel.name) ||
            channelId,
        })
      }
      return

    case 'channel_rename':
    case 'channel_archive':
    case 'channel_unarchive':
      if (channelId) {
        await refreshChannel(channelId)
      }
      return

    case 'channel_deleted':
      if (channelId) {
        await markChannelDeleted(channelId)
      }
      return

    case 'member_joined_channel':
      if (
        channelId &&
        event.channel_type === 'C' &&
        event.user === (await getBotUserId()) &&
        (await refreshChannel(channelId))
      ) {
        await runArchiveSync()
      }
      return

    case 'channel_left':
      if (channelId) {
        await setChannelMembership(channelId, false)
      }
      return

    case 'user_change':
    case 'team_join':
      if (event.user && typeof event.user === 'object') {
        await saveUser(event.user)
      }
      return
  }
}
