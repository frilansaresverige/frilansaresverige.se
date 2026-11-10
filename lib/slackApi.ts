import 'server-only'

import { slackEnv } from '@/lib/env'

export interface SlackResponse {
  ok: boolean
  error?: string
  [key: string]: unknown
}

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

  const response = await fetch(url, {
    method: httpMethod,
    headers: { Authorization: `Bearer ${slackEnv().SLACK_TOKEN}` },
    body: httpMethod === 'POST' ? body : undefined,
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Slack ${method} responded with HTTP ${response.status}`)
  }

  return (await response.json()) as SlackResponse
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
