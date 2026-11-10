import 'server-only'

import { slackSigningSecret } from '@/lib/env'
import { verifySlackSignature } from '@/lib/slackSignature'

// The raw body of a request from Slack, or null if it isn't signed by Slack.
export const readVerifiedBody = async (request: Request) => {
  const body = await request.text()

  const valid = verifySlackSignature({
    signingSecret: slackSigningSecret(),
    body,
    timestamp: request.headers.get('x-slack-request-timestamp'),
    signature: request.headers.get('x-slack-signature'),
  })

  return valid ? body : null
}
