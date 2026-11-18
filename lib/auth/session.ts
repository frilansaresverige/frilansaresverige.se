import 'server-only'

import { cookies } from 'next/headers'

import { slackLoginEnv } from '@/lib/env'

import { deriveKey, signToken, verifyToken } from './signedToken'

// Signed in members of the Slack workspace; no accounts of our own.
export interface Session {
  userId: string
  name: string
  exp: number
}

// The login in progress, between leaving for Slack and coming back.
export interface PendingLogin {
  state: string
  nonce: string
  next: string
  exp: number
}

const SESSION_COOKIE = 'arkiv_session'
const LOGIN_COOKIE = 'arkiv_login'
// The cookie lasts until the browser is closed; this caps browsers that
// restore sessions.
const SESSION_SECONDS = 7 * 24 * 60 * 60
const LOGIN_SECONDS = 10 * 60

const key = (purpose: 'session' | 'login') =>
  deriveKey(slackLoginEnv().SLACK_CLIENT_SECRET, purpose)

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

const expiresIn = (seconds: number) => Math.floor(Date.now() / 1000) + seconds

export const getSession = async () =>
  verifyToken<Session>(
    key('session'),
    (await cookies()).get(SESSION_COOKIE)?.value,
  )

export const startSession = async (userId: string, name: string) => {
  ;(await cookies()).set(
    SESSION_COOKIE,
    signToken(key('session'), {
      userId,
      name,
      exp: expiresIn(SESSION_SECONDS),
    }),
    cookieOptions,
  )
}

export const endSession = async () => {
  ;(await cookies()).delete(SESSION_COOKIE)
}

export const savePendingLogin = async (login: Omit<PendingLogin, 'exp'>) => {
  ;(await cookies()).set(
    LOGIN_COOKIE,
    signToken(key('login'), { ...login, exp: expiresIn(LOGIN_SECONDS) }),
    { ...cookieOptions, maxAge: LOGIN_SECONDS },
  )
}

// Read once: the cookie is removed whatever the outcome.
export const takePendingLogin = async () => {
  const store = await cookies()
  const login = verifyToken<PendingLogin>(
    key('login'),
    store.get(LOGIN_COOKIE)?.value,
  )
  store.delete(LOGIN_COOKIE)
  return login
}
