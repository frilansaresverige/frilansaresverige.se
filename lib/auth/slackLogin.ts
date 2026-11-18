import 'server-only'

import { siteUrl, slackEnv, slackLoginEnv } from '@/lib/env'
import { callSlack, callSlackOrThrow } from '@/lib/slackApi'

// "Sign in with Slack", Slack's OpenID Connect:
// https://docs.slack.dev/authentication/sign-in-with-slack

const AUTHORIZE_URL = 'https://slack.com/openid/connect/authorize'

export const redirectUri = () => `${siteUrl()}/api/auth/slack/callback`

let teamId: Promise<string> | null = null

// Our workspace, as the bot sees it.
const getTeamId = () =>
  (teamId ??= callSlackOrThrow('auth.test', {})
    .then((response) => response.team_id as string)
    .catch((error) => {
      teamId = null
      throw error
    }))

export const authorizeUrl = async (state: string, nonce: string) => {
  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    response_type: 'code',
    scope: 'openid profile',
    client_id: slackLoginEnv().SLACK_CLIENT_ID,
    redirect_uri: redirectUri(),
    state,
    nonce,
    // Takes the person straight to our workspace.
    team: await getTeamId(),
  }).toString()
  return url.toString()
}

export type LoginFailure =
  | 'CANCELLED'
  | 'INVALID_STATE'
  | 'TOKEN_EXCHANGE_FAILED'
  | 'WRONG_WORKSPACE'
  | 'NOT_A_MEMBER'

export class LoginError extends Error {
  constructor(readonly reason: LoginFailure) {
    super(reason)
  }
}

interface IdToken {
  iss?: string
  aud?: string
  exp?: number
  nonce?: string
  sub?: string
  name?: string
  'https://slack.com/user_id'?: string
  'https://slack.com/team_id'?: string
}

// The id token comes straight from Slack's token endpoint over TLS, so its
// claims can be trusted without checking the signature (OpenID Connect Core
// 3.1.3.7); they're still checked against what we asked for.
const readIdToken = (idToken: string) => {
  const [, payload] = idToken.split('.')
  if (!payload) {
    throw new LoginError('TOKEN_EXCHANGE_FAILED')
  }
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as IdToken
}

// Exchanges the code Slack sent back for who the person is, and makes sure
// they're a full member of our workspace. Returns their user id and name.
export const completeLogin = async (code: string, nonce: string) => {
  const { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } = slackLoginEnv()

  const response = await fetch(
    `${slackEnv().SLACK_API_URL.replace(/\/+$/, '')}/openid.connect.token`,
    {
      method: 'POST',
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri(),
      }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  const result = (await response.json()) as {
    ok: boolean
    id_token?: string
    error?: string
  }

  if (!result.ok || !result.id_token) {
    console.error('Slack sign-in failed:', result.error ?? response.status)
    throw new LoginError('TOKEN_EXCHANGE_FAILED')
  }

  const claims = readIdToken(result.id_token)
  const userId = claims['https://slack.com/user_id'] ?? claims.sub

  if (
    claims.iss !== 'https://slack.com' ||
    claims.aud !== SLACK_CLIENT_ID ||
    claims.nonce !== nonce ||
    (claims.exp ?? 0) < Date.now() / 1000 ||
    !userId
  ) {
    throw new LoginError('TOKEN_EXCHANGE_FAILED')
  }

  if (claims['https://slack.com/team_id'] !== (await getTeamId())) {
    throw new LoginError('WRONG_WORKSPACE')
  }

  // Guests and deactivated accounts can sign in to Slack, but not here.
  const info = await callSlack('users.info', { user: userId }, 'GET')
  const user = info.user as
    | {
        deleted?: boolean
        is_bot?: boolean
        is_restricted?: boolean
        is_ultra_restricted?: boolean
        real_name?: string
        profile?: { display_name?: string; real_name?: string }
      }
    | undefined

  if (
    !info.ok ||
    !user ||
    user.deleted ||
    user.is_bot ||
    user.is_restricted ||
    user.is_ultra_restricted
  ) {
    throw new LoginError('NOT_A_MEMBER')
  }

  const name =
    user.profile?.display_name ||
    user.real_name ||
    user.profile?.real_name ||
    claims.name ||
    userId

  return { userId, name }
}
