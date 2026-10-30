'use server'

import { z } from 'zod'

export type RequestSlackInvitationState = 'IDLE' | 'SUCCESS' | 'ERROR'

const field = z.string().trim().min(1).max(5000)

const invitationSchema = z.object({
  name: field,
  email: field,
  howlong: field,
  companyName: field,
  linkedin: field,
  motivation: field,
})

export async function requestSlackInvitation(
  _previousState: RequestSlackInvitationState,
  formData: FormData,
): Promise<RequestSlackInvitationState> {
  const webhookUrl = process.env.SLACK_REQUEST_INVITE_WEBHOOK_URL

  if (!webhookUrl) {
    console.error('SLACK_REQUEST_INVITE_WEBHOOK_URL is not set')
    return 'ERROR'
  }

  const parsed = invitationSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return 'ERROR'
  }

  const { name, email, howlong, companyName, linkedin, motivation } =
    parsed.data
  const companySearchUrl = `https://www.allabolag.se/what/${encodeURIComponent(companyName)}`

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Request for Slack invitation',
        icon_emoji: ':raised_hands:',
        text:
          'Ny frilansare på ingång! \n' +
          `Namn: ${name} \n` +
          `Email: ${email} \n` +
          `Tid som frilansare: ${howlong} \n` +
          `Företagsnamn: ${companyName}, ${companySearchUrl} \n` +
          `LinkedIn: ${linkedin} \n` +
          `Motivering: ${motivation}`,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(
        `Slack responded with ${response.status}: ${await response.text()}`,
      )
    }
  } catch (error) {
    console.error('Failed to forward a Slack invitation request:', error)
    return 'ERROR'
  }

  return 'SUCCESS'
}
