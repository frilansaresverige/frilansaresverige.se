import { describe, expect, it } from 'vitest'

import { hasReactionFrom, parseInviteRequest } from './parse'

const request = {
  type: 'message',
  user: 'USLACKBOT',
  ts: '1800000000.000100',
  text: '<@U012ABCDEF> har bett om att få bjuda in Anna@Example.com och <mailto:bo@example.se|bo@example.se>',
}

describe('parseInviteRequest', () => {
  it('finds the inviter and the invitees', () => {
    expect(parseInviteRequest(request)).toEqual({
      ts: '1800000000.000100',
      inviterId: 'U012ABCDEF',
      invitees: ['anna@example.com', 'bo@example.se'],
    })
  })

  it('looks in blocks and attachments too', () => {
    expect(
      parseInviteRequest({
        ...request,
        text: 'Ny inbjudningsförfrågan',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '<@W0ABCDEFG|anna> vill bjuda in' },
          },
        ],
        attachments: [{ fields: [{ value: 'cecilia@example.org' }] }],
      }),
    ).toMatchObject({
      inviterId: 'W0ABCDEFG',
      invitees: ['cecilia@example.org'],
    })
  })

  it('ignores messages from anyone but Slackbot', () => {
    expect(parseInviteRequest({ ...request, user: 'U012ABCDEF' })).toBeNull()
  })

  it('ignores replies in threads', () => {
    expect(
      parseInviteRequest({ ...request, thread_ts: '1799999999.000100' }),
    ).toBeNull()
  })

  it('ignores Slackbot messages that are not invite requests', () => {
    expect(
      parseInviteRequest({ ...request, text: 'Påminnelse: <@U012ABCDEF>' }),
    ).toBeNull()
    expect(
      parseInviteRequest({ ...request, text: 'Skicka till anna@example.com' }),
    ).toBeNull()
  })
})

describe('hasReactionFrom', () => {
  it('only counts the given user’s reaction', () => {
    const message = {
      ...request,
      reactions: [{ name: 'envelope_with_arrow', users: ['UADMIN'] }],
    }

    expect(hasReactionFrom(message, 'envelope_with_arrow', 'UBOT')).toBe(false)
    expect(hasReactionFrom(message, 'envelope_with_arrow', 'UADMIN')).toBe(true)
  })
})
