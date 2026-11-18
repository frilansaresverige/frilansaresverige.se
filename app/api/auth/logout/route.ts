import { endSession } from '@/lib/auth/session'
import { isSlackLoginConfigured, siteUrl } from '@/lib/env'

// A form POST, so a link or an image elsewhere can't sign anyone out. 303, so
// the browser follows with a GET.
export async function POST() {
  if (isSlackLoginConfigured()) {
    await endSession()
  }
  return Response.redirect(`${siteUrl()}/arkiv`, 303)
}
