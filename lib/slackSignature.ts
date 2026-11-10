import { createHmac, timingSafeEqual } from 'node:crypto'

// Requests older than this are rejected, so a captured request can't be
// replayed later. Slack recommends five minutes.
const MAX_AGE_SECONDS = 5 * 60

// https://docs.slack.dev/authentication/verifying-requests-from-slack
export const verifySlackSignature = ({
  signingSecret,
  body,
  timestamp,
  signature,
  now = Date.now(),
}: {
  signingSecret: string
  body: string
  timestamp: string | null
  signature: string | null
  now?: number
}) => {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return false
  }

  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) {
    return false
  }

  const expected = Buffer.from(
    'v0=' +
      createHmac('sha256', signingSecret)
        .update(`v0:${timestamp}:${body}`)
        .digest('hex'),
  )
  const actual = Buffer.from(signature)

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
