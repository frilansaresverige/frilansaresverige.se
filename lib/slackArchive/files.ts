import 'server-only'

import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { slackArchiveEnv, slackEnv } from '@/lib/env'
import { callSlack } from '@/lib/slackApi'

import { safeFileName, type SlackFileObject } from './normalize'
import {
  filesToDownload,
  markFileDownloaded,
  markFileFailed,
  markFileSkipped,
  updateFileRaw,
} from './store'

// The app lacks files:read, or its token stopped working. Trying the other
// files would fail the same way, so the run stops without counting attempts.
class NotAuthorizedError extends Error {}

// Recorded as failed for good: there's nothing to download.
class SkipError extends Error {}

const fetchFileInfo = async (id: string) => {
  const response = await callSlack('files.info', { file: id }, 'GET')

  if (!response.ok) {
    if (
      response.error === 'missing_scope' ||
      response.error === 'not_authed' ||
      response.error === 'invalid_auth'
    ) {
      throw new NotAuthorizedError(`files.info: ${response.error}`)
    }
    if (
      response.error === 'file_not_found' ||
      response.error === 'file_deleted'
    ) {
      throw new SkipError(`files.info: ${response.error}`)
    }
    throw new Error(`files.info: ${response.error}`)
  }

  return response.file as SlackFileObject
}

const downloadFile = async (row: {
  id: string
  name: string | null
  raw: unknown
}) => {
  let file = row.raw as SlackFileObject

  // Events sometimes carry only the file's id.
  if (!file.url_private_download && !file.url_private) {
    file = await fetchFileInfo(row.id)
    await updateFileRaw(row.id, file)
  }

  if (file.mode === 'external' || file.is_external) {
    throw new SkipError('Stored outside Slack (e.g. Google Drive)')
  }

  const { SLACK_ARCHIVE_FILES_DIR, SLACK_ARCHIVE_MAX_FILE_BYTES } =
    slackArchiveEnv()

  if ((file.size ?? 0) > SLACK_ARCHIVE_MAX_FILE_BYTES) {
    throw new SkipError(`Larger than ${SLACK_ARCHIVE_MAX_FILE_BYTES} bytes`)
  }

  const url = file.url_private_download ?? file.url_private
  if (!url) {
    throw new SkipError('No download URL')
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${slackEnv().SLACK_TOKEN}` },
    signal: AbortSignal.timeout(10 * 60 * 1000),
  })

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`)
  }

  // Without files:read Slack answers with its sign-in page instead.
  if (
    response.headers.get('content-type')?.startsWith('text/html') &&
    file.mimetype !== 'text/html'
  ) {
    await response.body.cancel()
    throw new NotAuthorizedError(
      'Slack returned a web page instead of the file; does the app have files:read?',
    )
  }

  const name = safeFileName(file.name ?? row.name, row.id)
  const directory = path.join(SLACK_ARCHIVE_FILES_DIR, row.id)
  const partial = path.join(directory, `.${name}.part`)

  await mkdir(directory, { recursive: true })
  try {
    await pipeline(
      Readable.fromWeb(
        response.body as import('node:stream/web').ReadableStream,
      ),
      createWriteStream(partial),
    )
    await rename(partial, path.join(directory, name))
  } catch (error) {
    await rm(partial, { force: true })
    throw error
  }

  await markFileDownloaded(row.id, path.posix.join(row.id, name))
}

let running = false
let reportedUnauthorized = false

// Downloads every attachment that isn't on disk yet, one at a time. Failures
// are retried on later runs, up to MAX_DOWNLOAD_ATTEMPTS.
export const downloadPendingFiles = async () => {
  if (running) {
    return
  }
  running = true

  try {
    let downloaded = 0
    // A batch at a time; a file that keeps failing moves to the back.
    for (;;) {
      const batch = await filesToDownload(20)
      if (batch.length === 0) {
        break
      }

      for (const row of batch) {
        try {
          await downloadFile(row)
          downloaded++
          reportedUnauthorized = false
        } catch (error) {
          if (error instanceof NotAuthorizedError) {
            if (!reportedUnauthorized) {
              console.error(`Can't download Slack files: ${error.message}`)
              reportedUnauthorized = true
            }
            return
          }

          const message = error instanceof Error ? error.message : String(error)
          if (error instanceof SkipError) {
            await markFileSkipped(row.id, message)
          } else {
            await markFileFailed(row.id, message)
            console.error(`Failed to download Slack file ${row.id}:`, message)
          }
        }
      }
    }

    if (downloaded > 0) {
      console.log(`Downloaded ${downloaded} Slack file(s).`)
    }
  } finally {
    running = false
  }
}
