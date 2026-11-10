import { after } from 'next/server'

import { isSlackAppConfigured } from '@/lib/env'
import { handleMessage, publishHome } from '@/lib/inviteRequests/bot'
import type { SlackMessage } from '@/lib/inviteRequests/parse'
import { readVerifiedBody } from '@/lib/inviteRequests/verifyRequest'

// Slack's Events API. Slack expects an answer within three seconds and retries
// otherwise, so the work happens after responding.
export async function POST(request: Request) {
  if (!isSlackAppConfigured()) {
    return new Response(null, { status: 503 })
  }

  const body = await readVerifiedBody(request)

  if (body === null) {
    return new Response(null, { status: 401 })
  }

  const payload = JSON.parse(body) as {
    type: string
    challenge?: string
    event?: SlackMessage & { channel?: string; tab?: string }
  }

  if (payload.type === 'url_verification') {
    return Response.json({ challenge: payload.challenge })
  }

  const event = payload.event

  if (payload.type === 'event_callback' && event?.type === 'message') {
    after(async () => {
      try {
        await handleMessage(event.channel ?? '', event)
      } catch (error) {
        console.error(`Failed to handle invite request ${event.ts}:`, error)
      }
    })
  }

  if (
    payload.type === 'event_callback' &&
    event?.type === 'app_home_opened' &&
    event.tab === 'home' &&
    event.user
  ) {
    const userId = event.user
    after(async () => {
      try {
        await publishHome(userId)
      } catch (error) {
        console.error(`Failed to publish the Home tab for ${userId}:`, error)
      }
    })
  }

  return new Response(null, { status: 200 })
}
