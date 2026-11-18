import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { startSession, takePendingLogin } from '@/lib/auth/session'
import {
  completeLogin,
  LoginError,
  type LoginFailure,
} from '@/lib/auth/slackLogin'
import { isSlackLoginConfigured } from '@/lib/env'

const errorCodes: Record<LoginFailure, string> = {
  CANCELLED: 'avbruten',
  INVALID_STATE: 'utgangen',
  TOKEN_EXCHANGE_FAILED: 'misslyckad',
  WRONG_WORKSPACE: 'fel-workspace',
  NOT_A_MEMBER: 'ej-medlem',
}

// Where Slack sends the person back after signing in.
export async function GET(request: NextRequest) {
  if (!isSlackLoginConfigured()) {
    redirect('/arkiv?fel=ej-konfigurerad')
  }

  const params = request.nextUrl.searchParams
  const pending = await takePendingLogin()
  let destination: string

  try {
    if (params.get('error')) {
      throw new LoginError('CANCELLED')
    }

    const code = params.get('code')
    if (!pending || !code || params.get('state') !== pending.state) {
      throw new LoginError('INVALID_STATE')
    }

    const { userId, name } = await completeLogin(code, pending.nonce)
    await startSession(userId, name)
    destination = pending.next
  } catch (error) {
    if (!(error instanceof LoginError)) {
      console.error('Slack sign-in failed:', error)
    }
    const reason =
      error instanceof LoginError ? error.reason : 'TOKEN_EXCHANGE_FAILED'
    destination = `/arkiv?fel=${errorCodes[reason]}`
  }

  redirect(destination)
}
