import { access, constants } from 'node:fs/promises'

import { checkDatabaseHealth } from '@/lib/assignments'
import { isSlackArchiveEnabled, slackArchiveEnv } from '@/lib/env'

// Readiness: whether the site can take requests. Only the database is
// required; the archive's files directory is reported but doesn't count.
// See the automation repository's practices/health-endpoints.md.
export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 3000

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timed out')), TIMEOUT_MS),
    ),
  ])

const check = async (task: () => Promise<unknown>) => {
  try {
    await withTimeout(task())
    return 'ok'
  } catch (error) {
    return error instanceof Error ? error.message : 'failed'
  }
}

export async function GET() {
  const database = await check(checkDatabaseHealth)
  const archiveFiles = isSlackArchiveEnabled()
    ? await check(() =>
        access(slackArchiveEnv().SLACK_ARCHIVE_FILES_DIR, constants.W_OK),
      )
    : 'disabled'
  const ready = database === 'ok'

  return Response.json(
    { status: ready ? 'ready' : 'not ready', database, archiveFiles },
    {
      status: ready ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  )
}
