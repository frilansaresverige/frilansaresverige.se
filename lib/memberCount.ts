import 'server-only'

import { fetchMemberCount } from '@/lib/slack'

const MAX_AGE_MS = 60 * 60 * 1000
const FIRST_FETCH_TIMEOUT_MS = 1000

let cached: { count: number; fetchedAt: number } | null = null
let refreshing: Promise<number | null> | null = null

const refresh = () =>
  (refreshing ??= fetchMemberCount()
    .then((count) => {
      cached = { count, fetchedAt: Date.now() }
      return count
    })
    .catch((error) => {
      console.error('Failed to refresh the member count:', error)
      return null
    })
    .finally(() => {
      refreshing = null
    }))

// Serves the cached count right away and refreshes it in the background once
// it's an hour old. Only the very first request waits, and only briefly.
export const getMemberCount = async (): Promise<number | null> => {
  if (cached) {
    if (Date.now() - cached.fetchedAt > MAX_AGE_MS) {
      void refresh()
    }
    return cached.count
  }

  if (!process.env.SLACK_TOKEN) {
    return null
  }

  return Promise.race([
    refresh(),
    new Promise<null>((resolve) =>
      setTimeout(resolve, FIRST_FETCH_TIMEOUT_MS, null),
    ),
  ])
}
