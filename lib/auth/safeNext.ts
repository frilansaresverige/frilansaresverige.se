// Where to go after signing in: only back into the archive, never to another
// site or another part of this one.
export const safeNext = (next: string | null | undefined) =>
  next && /^\/arkiv(?:[/?#]|$)/.test(next) && !next.includes('//')
    ? next
    : '/arkiv'
