import type { NextApiRequest, NextApiResponse } from 'next'
import https from 'https'

const slackWebHookURL: string | undefined =
  process.env.SLACK_REQUEST_INVITE_WEBHOOK_URL

interface RequestSlackInvitationBody {
  name: string
  email: string
  howlong: string
  linkedin: string
  motivation: string
}

interface ErrorResponse {
  error: string
}
interface SuccessResponse {
  success: boolean
  name: string
  slackResponse: string
}

type MessageBody = {
  username: string
  icon_emoji: string
  text: string
}

const messageBody: MessageBody = {
  username: 'Request for Slack invitation',
  icon_emoji: ':raised_hands:',
  text: '',
}

/**
 * Handles the actual sending request.
 */
function sendSlackMessage(
  webhookURL: string,
  messageBody: MessageBody
): Promise<string> {
  let messageString: string | undefined
  // make sure the incoming message body can be parsed into valid JSON
  try {
    messageString = JSON.stringify(messageBody)
  } catch (_error) {
    throw new Error('Failed to stringify messageBody')
  }

  // Promisify the https.request
  return new Promise((resolve, reject) => {
    // general request options, we defined that it's a POST request and content is JSON
    const requestOptions = {
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
    }

    const req = https.request(webhookURL, requestOptions, (res) => {
      let response = ''
      res.on('data', (d) => {
        response += d
      })
      res.on('end', () => {
        resolve(response)
      })
    })

    req.on('error', (e) => {
      reject(e)
    })

    req.write(messageString)
    req.end()
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (!slackWebHookURL) {
    console.error('Please fill in your Webhook URL')
    res.status(400).json({ error: 'Please fill in the Slack Webhook URL' })
    return
  }

  const body: RequestSlackInvitationBody = req.body

  const newMessage: MessageBody = {
    ...messageBody,
    text: `Ny frilansare på ingång! \nNamn: ${body.name} \nEmail: ${body.email} \nTid som frilansare: ${body.howlong} \nLinkedIn: ${body.linkedin} \nMotivering: ${body.motivation}`,
  }

  const slackResponse = await sendSlackMessage(slackWebHookURL, newMessage)

  res.status(200).json({
    success: true,
    name: 'Request Slack invitation result',
    slackResponse,
  })
}
