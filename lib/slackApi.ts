import 'server-only'

import { slackEnv } from '@/lib/env'

export interface SlackResponse {
  ok: boolean
  error?: string
  [key: string]: unknown
}

const MAX_ATTEMPTS = 6

// Parameters are form-encoded; structured ones (blocks, views) go in as JSON
// strings, which every Web API method accepts.
export const callSlack = async (
  method: string,
  params: Record<string, string | undefined>,
  httpMethod: 'GET' | 'POST' = 'POST',
): Promise<SlackResponse> => {
  const body = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  )
  const url = new URL(
    `${slackEnv().SLACK_API_URL.replace(/\/+$/, '')}/${method}`,
  )
  if (httpMethod === 'GET') {
    url.search = body.toString()
  }

  // Slack answers 429 with Retry-After when a method's rate limit is reached;
  // waiting that long and trying again is what it asks for.
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      method: httpMethod,
      headers: { Authorization: `Bearer ${slackEnv().SLACK_TOKEN}` },
      body: httpMethod === 'POST' ? body : undefined,
      signal: AbortSignal.timeout(30_000),
    })

    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      const seconds = Number(response.headers.get('retry-after')) || 30
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
      continue
    }

    if (!response.ok) {
      throw new Error(`Slack ${method} responded with HTTP ${response.status}`)
    }

    return (await response.json()) as SlackResponse
  }
}

// Like callSlack, but throws unless Slack reports success.
export const callSlackOrThrow = async (
  method: string,
  params: Record<string, string | undefined>,
  httpMethod: 'GET' | 'POST' = 'POST',
) => {
  const response = await callSlack(method, params, httpMethod)

  if (!response.ok) {
    throw new Error(`Slack ${method} failed: ${response.error ?? 'unknown'}`)
  }

  return response
}

let botUserId: Promise<string> | null = null

// The bot's own Slack user id, looked up once.
export const getBotUserId = () =>
  (botUserId ??= callSlackOrThrow('auth.test', {})
    .then((response) => response.user_id as string)
    .catch((error) => {
      botUserId = null
      throw error
    }))
