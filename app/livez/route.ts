// Liveness: the process answers. See the automation repository's
// practices/health-endpoints.md.
export const dynamic = 'force-dynamic'

export function GET() {
  return new Response('ok\n', {
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
  })
}
