import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

// A small signed token for cookies: base64url(JSON).base64url(HMAC). Not
// encrypted, so it must hold nothing secret; it only can't be forged.

const base64url = (data: Buffer | string) =>
  Buffer.from(data).toString('base64url')

// A key per purpose, so a token made for one cookie is no good in another.
export const deriveKey = (secret: string, purpose: string) =>
  Buffer.from(hkdfSync('sha256', secret, 'frilansaresverige.se', purpose, 32))

const mac = (key: Buffer, data: string) =>
  createHmac('sha256', key).update(data).digest()

export const signToken = (key: Buffer, payload: object) => {
  const data = base64url(JSON.stringify(payload))
  return `${data}.${base64url(mac(key, data))}`
}

// The payload, or null if the token is forged, malformed or expired. `exp` is
// Unix seconds.
export const verifyToken = <T extends { exp: number }>(
  key: Buffer,
  token: string | undefined,
  now = Date.now(),
): T | null => {
  const [data, signature, extra] = token?.split('.') ?? []

  if (!data || !signature || extra !== undefined) {
    return null
  }

  const expected = mac(key, data)
  const actual = Buffer.from(signature, 'base64url')

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as T
    return typeof payload.exp === 'number' && payload.exp > now / 1000
      ? payload
      : null
  } catch {
    return null
  }
}
