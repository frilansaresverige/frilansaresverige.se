import { randomBytes } from 'node:crypto'

import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { safeNext } from '@/lib/auth/safeNext'
import { savePendingLogin } from '@/lib/auth/session'
import { authorizeUrl } from '@/lib/auth/slackLogin'
import { isSlackLoginConfigured } from '@/lib/env'

export async function GET(request: NextRequest) {
  if (!isSlackLoginConfigured()) {
    redirect('/arkiv?fel=ej-konfigurerad')
  }

  const state = randomBytes(16).toString('base64url')
  const nonce = randomBytes(16).toString('base64url')

  await savePendingLogin({
    state,
    nonce,
    next: safeNext(request.nextUrl.searchParams.get('next')),
  })

  redirect(await authorizeUrl(state, nonce))
}
