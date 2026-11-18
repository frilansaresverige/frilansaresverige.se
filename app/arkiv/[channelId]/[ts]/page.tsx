import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { getMember, getThread, mentionNames } from '@/lib/slackArchive/search'

import styles from '../../arkiv.module.css'
import MessageView from '../../MessageView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Slack-arkivet',
  robots: { index: false, follow: false },
}

// A message with its whole thread.
export default async function Thread({
  params,
}: PageProps<'/arkiv/[channelId]/[ts]'>) {
  const { channelId, ts } = await params

  if (!(await getMember())) {
    redirect(
      `/api/auth/slack/login?next=${encodeURIComponent(`/arkiv/${channelId}/${ts}`)}`,
    )
  }

  if (!/^C[A-Z0-9]+$/.test(channelId) || !/^\d+\.\d+$/.test(ts)) {
    notFound()
  }

  const thread = await getThread(channelId, ts)
  if (!thread || thread.messages.length === 0) {
    notFound()
  }

  const names = await mentionNames(thread.messages.map((m) => m.text))
  const channelName = thread.messages[0]?.channelName

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <h1>{channelName ? `#${channelName}` : 'Tråd'}</h1>
        <Link href="/arkiv">« Till sökningen</Link>
      </div>

      <article className={styles.card}>
        {thread.messages.map((message) => (
          <MessageView key={message.ts} message={message} names={names} />
        ))}
      </article>
    </div>
  )
}
