import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { verifySlackSignature } from './slackSignature'

const signingSecret = 'hemlig'
const body = 'token=x&command=%2Finbjudningar'
const now = 1_800_000_000_000
const timestamp = String(now / 1000)
const sign = (text: string, secret = signingSecret) =>
  'v0=' + createHmac('sha256', secret).update(text).digest('hex')

describe('verifySlackSignature', () => {
  it('accepts a correctly signed, fresh request', () => {
    expect(
      verifySlackSignature({
        signingSecret,
        body,
        timestamp,
        signature: sign(`v0:${timestamp}:${body}`),
        now,
      }),
    ).toBe(true)
  })

  it('rejects a wrong signature, a tampered body or another secret', () => {
    const signature = sign(`v0:${timestamp}:${body}`)

    expect(
      verifySlackSignature({
        signingSecret,
        body: body + 'x',
        timestamp,
        signature,
        now,
      }),
    ).toBe(false)
    expect(
      verifySlackSignature({
        signingSecret,
        body,
        timestamp,
        signature: sign(`v0:${timestamp}:${body}`, 'annan'),
        now,
      }),
    ).toBe(false)
    expect(
      verifySlackSignature({
        signingSecret,
        body,
        timestamp,
        signature: 'v0=00',
        now,
      }),
    ).toBe(false)
  })

  it('rejects stale or missing timestamps', () => {
    const old = String(now / 1000 - 301)

    expect(
      verifySlackSignature({
        signingSecret,
        body,
        timestamp: old,
        signature: sign(`v0:${old}:${body}`),
        now,
      }),
    ).toBe(false)
    expect(
      verifySlackSignature({
        signingSecret,
        body,
        timestamp: null,
        signature: null,
        now,
      }),
    ).toBe(false)
  })
})
