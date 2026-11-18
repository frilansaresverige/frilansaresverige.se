import { describe, expect, it } from 'vitest'

import { deriveKey, signToken, verifyToken } from './signedToken'

const key = deriveKey('client-secret', 'session')
const now = 1_800_000_000_000
const payload = { userId: 'U0ANNA', exp: now / 1000 + 60 }

describe('signed tokens', () => {
  it('round-trips a payload', () => {
    expect(verifyToken(key, signToken(key, payload), now)).toEqual(payload)
  })

  it('rejects expired, tampered and foreign tokens', () => {
    expect(
      verifyToken(
        key,
        signToken(key, { ...payload, exp: now / 1000 - 1 }),
        now,
      ),
    ).toBeNull()

    const [data, signature] = signToken(key, payload).split('.')
    const forged = Buffer.from(
      JSON.stringify({ ...payload, userId: 'U0ADMIN' }),
    ).toString('base64url')
    expect(verifyToken(key, `${forged}.${signature}`, now)).toBeNull()
    expect(verifyToken(key, `${data}.${signature}x`, now)).toBeNull()

    // Same secret, other purpose.
    const loginKey = deriveKey('client-secret', 'login')
    expect(verifyToken(loginKey, signToken(key, payload), now)).toBeNull()
  })

  it('rejects junk', () => {
    for (const token of [undefined, '', 'abc', 'a.b.c', '.', 'e30.']) {
      expect(verifyToken(key, token, now)).toBeNull()
    }
  })
})
