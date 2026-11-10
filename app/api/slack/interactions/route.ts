import { after } from 'next/server'

import { isSlackAppConfigured } from '@/lib/env'
import {
  applicationUrl,
  canEditTemplate,
  openTemplateModal,
  publishHome,
} from '@/lib/inviteRequests/bot'
import { OPEN_TEMPLATE_ACTION_ID } from '@/lib/inviteRequests/homeView'
import {
  resetRejectionTemplate,
  saveRejectionTemplate,
} from '@/lib/inviteRequests/store'
import {
  DEFAULT_REJECTION_TEMPLATE,
  MAX_TEMPLATE_LENGTH,
  renderRejection,
  unknownPlaceholders,
} from '@/lib/inviteRequests/template'
import {
  TEMPLATE_ACTION_ID,
  TEMPLATE_BLOCK_ID,
  TEMPLATE_MODAL_CALLBACK_ID,
} from '@/lib/inviteRequests/templateModal'
import { readVerifiedBody } from '@/lib/inviteRequests/verifyRequest'
import { callSlackOrThrow } from '@/lib/slackApi'

interface BlockActions {
  type: 'block_actions'
  user: { id: string }
  trigger_id: string
  actions: { action_id: string }[]
}

interface ViewSubmission {
  type: 'view_submission'
  user: { id: string }
  view: {
    callback_id: string
    state: {
      values: Record<string, Record<string, { value?: string | null }>>
    }
  }
}

const fieldError = (message: string) =>
  Response.json({
    response_action: 'errors',
    errors: { [TEMPLATE_BLOCK_ID]: message },
  })

// The button on fribot's Home tab, and submissions of the dialog it opens.
export async function POST(request: Request) {
  if (!isSlackAppConfigured()) {
    return new Response(null, { status: 503 })
  }

  const body = await readVerifiedBody(request)

  if (body === null) {
    return new Response(null, { status: 401 })
  }

  const payload = JSON.parse(
    new URLSearchParams(body).get('payload') ?? '{}',
  ) as Partial<ViewSubmission> | Partial<BlockActions>

  // The button on the Home tab.
  if (
    payload.type === 'block_actions' &&
    payload.actions?.some((a) => a.action_id === OPEN_TEMPLATE_ACTION_ID) &&
    payload.user &&
    payload.trigger_id
  ) {
    if (await canEditTemplate(payload.user.id)) {
      try {
        await openTemplateModal(payload.trigger_id)
      } catch (error) {
        console.error('Failed to open the invite template dialog:', error)
      }
    }
    return new Response(null, { status: 200 })
  }

  if (
    payload.type !== 'view_submission' ||
    payload.view?.callback_id !== TEMPLATE_MODAL_CALLBACK_ID ||
    !payload.user
  ) {
    return new Response(null, { status: 200 })
  }

  const userId = payload.user.id

  // Checked again, in case someone lost their rights with the dialog open.
  if (!(await canEditTemplate(userId))) {
    return fieldError('Du har inte längre behörighet att ändra mallen.')
  }

  const template = (
    payload.view.state.values[TEMPLATE_BLOCK_ID]?.[TEMPLATE_ACTION_ID]?.value ??
    ''
  ).trim()

  if (template.length > MAX_TEMPLATE_LENGTH) {
    return fieldError(`Mallen får vara högst ${MAX_TEMPLATE_LENGTH} tecken.`)
  }

  const unknown = unknownPlaceholders(template)
  if (unknown.length > 0) {
    return fieldError(
      `Okänd platshållare: ${unknown.map((key) => `[[${key}]]`).join(', ')}`,
    )
  }

  if (template) {
    await saveRejectionTemplate(template, userId)
  } else {
    await resetRejectionTemplate()
  }

  // A preview, so the admin sees what members will receive.
  after(async () => {
    try {
      const preview = renderRejection(template || DEFAULT_REJECTION_TEMPLATE, {
        inviterId: userId,
        invitees: ['namn@example.com'],
        applicationUrl: applicationUrl(),
      })
      await callSlackOrThrow('chat.postMessage', {
        channel: userId,
        text: `${template ? 'Mallen är sparad.' : 'Standardtexten används igen.'} Så här ser meddelandet ut, med dig som inbjudare:\n\n>>> ${preview}`,
        unfurl_links: 'false',
      })
      await publishHome(userId)
    } catch (error) {
      console.error('Failed to send the invite template preview:', error)
    }
  })

  return new Response(null, { status: 200 })
}
