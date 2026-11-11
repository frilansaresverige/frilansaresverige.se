import { describe, expect, it } from 'vitest'

import {
  hasReactionFrom,
  hasReactionsFromOthers,
  parseInviteRequest,
  type SlackMessage,
} from './parse'

// Shaped like the requests Slackbot posts, with made-up ids and addresses.
const buttons = {
  id: 3,
  callback_id: 'inviterequests_T0WORKSPACE',
  actions: [
    { name: 'approve', text: 'Send Invitation', type: 'button' },
    { name: 'deny', text: 'Deny', type: 'button' },
  ],
}

const request: SlackMessage = {
  type: 'message',
  user: 'USLACKBOT',
  bot_id: 'B01',
  ts: '1800000000.000100',
  text: '<@U012ABCDEF> requested to invite one person to this workspace.',
  attachments: [
    { text: '*Email*: <mailto:Anna@Example.com|Anna@Example.com>' },
    {
      text: '*Reason for Request*:\nKollega, nås på bo@example.se eller via <@U0OTHER1>',
    },
    buttons,
  ],
}

describe('parseInviteRequest', () => {
  it('finds the inviter and the invited address', () => {
    expect(parseInviteRequest(request)).toEqual({
      ts: '1800000000.000100',
      inviterId: 'U012ABCDEF',
      invitees: ['anna@example.com'],
    })
  })

  it('handles requests for several people', () => {
    expect(
      parseInviteRequest({
        ...request,
        text: '<@U012ABCDEF> requested to invite 2 people to this workspace.',
        attachments: [
          {
            text: '*Emails*: <mailto:a@example.com|a@example.com>, <mailto:b@example.com|b@example.com>',
          },
          buttons,
        ],
      })?.invitees,
    ).toEqual(['a@example.com', 'b@example.com'])
  })

  it('ignores requests an admin has already approved or denied', () => {
    for (const outcome of [
      ':white_check_mark: <@U0ADMIN> approved this request. Invitation sent.',
      ':no_entry_sign: <@U0ADMIN> denied this request.',
    ]) {
      expect(
        parseInviteRequest({
          ...request,
          attachments: [request.attachments![0]!, { text: outcome }],
        }),
      ).toBeNull()
    }
  })

  it('ignores messages from anyone but Slackbot, and edits', () => {
    expect(parseInviteRequest({ ...request, user: 'U012ABCDEF' })).toBeNull()
    expect(
      parseInviteRequest({ ...request, subtype: 'message_changed' }),
    ).toBeNull()
  })

  it('ignores replies in threads', () => {
    expect(
      parseInviteRequest({ ...request, thread_ts: '1799999999.000100' }),
    ).toBeNull()
  })

  it('ignores other Slackbot messages and requests without an address', () => {
    expect(
      parseInviteRequest({ ...request, text: 'Påminnelse till <@U012ABCDEF>' }),
    ).toBeNull()
    expect(
      parseInviteRequest({ ...request, attachments: [buttons] }),
    ).toBeNull()
  })
})

describe('reactions', () => {
  const message = {
    ...request,
    reactions: [{ name: 'envelope_with_arrow', users: ['UBOT'] }],
  }

  it('tells the bot’s own reaction apart from others’', () => {
    expect(hasReactionFrom(message, 'envelope_with_arrow', 'UBOT')).toBe(true)
    expect(hasReactionsFromOthers(message, 'UBOT')).toBe(false)

    const watched = {
      ...message,
      reactions: [...message.reactions, { name: 'eyes', users: ['U0ADMIN'] }],
    }
    expect(hasReactionsFromOthers(watched, 'UBOT')).toBe(true)
  })
})
