import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import { slackArchiveEnv } from '@/lib/env'
import { getArchivedFile, getMember } from '@/lib/slackArchive/search'

// Images that are safe to show in the browser. Everything else is downloaded:
// an HTML or SVG file shown on our own domain could run scripts as us.
const INLINE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

const contentDisposition = (disposition: string, name: string) =>
  `${disposition}; filename="${name.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`

// An archived attachment, for signed-in members only.
export async function GET(
  _request: Request,
  { params }: RouteContext<'/api/arkiv/filer/[fileId]'>,
) {
  if (!(await getMember())) {
    return new Response(null, { status: 401 })
  }

  const { fileId } = await params
  const file = /^F[A-Z0-9]+$/.test(fileId)
    ? await getArchivedFile(fileId)
    : null

  if (!file?.path) {
    return new Response(null, { status: 404 })
  }

  const base = path.resolve(slackArchiveEnv().SLACK_ARCHIVE_FILES_DIR)
  const fullPath = path.resolve(base, file.path)

  if (!fullPath.startsWith(base + path.sep)) {
    return new Response(null, { status: 404 })
  }

  let size: number
  try {
    size = (await stat(fullPath)).size
  } catch {
    return new Response(null, { status: 404 })
  }

  const inline = INLINE_TYPES.includes(file.mimetype ?? '')

  return new Response(
    Readable.toWeb(createReadStream(fullPath)) as ReadableStream,
    {
      headers: {
        'content-type': inline ? file.mimetype! : 'application/octet-stream',
        'content-length': String(size),
        'content-disposition': contentDisposition(
          inline ? 'inline' : 'attachment',
          file.name ?? file.id,
        ),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
        'cache-control': 'private, max-age=3600',
      },
    },
  )
}
