import type { Metadata } from 'next'
import Link from 'next/link'

import {
  archivedChannels,
  getMember,
  mentionNames,
  PAGE_SIZE,
  searchMessages,
} from '@/lib/slackArchive/search'
import { excerpt } from '@/lib/slackArchive/mrkdwn'

import styles from './arkiv.module.css'
import MessageView, { ThreadLink } from './MessageView'
import SignIn from './SignIn'

export const dynamic = 'force-dynamic'

// Members only, so nothing here should be indexed.
export const metadata: Metadata = {
  title: 'Slack-arkivet',
  robots: { index: false, follow: false },
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function Arkiv({ searchParams }: PageProps<'/arkiv'>) {
  const params = await searchParams
  const query = first(params.q)?.trim() ?? ''
  const channelId = first(params.kanal) || undefined
  const page = Math.max(1, Number.parseInt(first(params.sida) ?? '1', 10) || 1)

  const member = await getMember()

  if (!member) {
    const next = `/arkiv${query ? `?q=${encodeURIComponent(query)}` : ''}`
    return (
      <div className={styles.wrapper}>
        <h1>Slack-arkivet</h1>
        <SignIn error={first(params.fel)} next={next} />
      </div>
    )
  }

  const [channels, result] = await Promise.all([
    archivedChannels(),
    searchMessages({ query, channelId, page }),
  ])
  const shown = result.messages.map((m) => ({
    ...m,
    text: excerpt(m.text, result.terms),
  }))
  const names = await mentionNames(shown.map((m) => m.text))

  const pageHref = (target: number) => {
    const search = new URLSearchParams({ q: query })
    if (channelId) search.set('kanal', channelId)
    if (target > 1) search.set('sida', String(target))
    return `/arkiv?${search}`
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <h1>Slack-arkivet</h1>
        <form action="/api/auth/logout" method="post">
          Inloggad som {member.name} ·{' '}
          <button type="submit" className={styles.linkButton}>
            Logga ut
          </button>
        </form>
      </div>

      <form className={`${styles.card} ${styles.search}`} action="/arkiv">
        <div className={styles.fields}>
          <label>
            <span>Sök efter</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder='t.ex. moms eller "enskild firma"'
              autoFocus={!query}
            />
          </label>
          <label>
            <span>Kanal</span>
            <select name="kanal" defaultValue={channelId ?? ''}>
              <option value="">Alla kanaler</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="primary-button">
          Sök
        </button>
      </form>

      {!query ? (
        <p>
          Arkivet innehåller meddelanden från de publika kanaler som fribot är
          med i, från och med att de arkiverades. Sökningen hittar ord även
          inuti andra ord, så <em>bokför</em> hittar också <em>bokföring</em>.
        </p>
      ) : result.terms.length === 0 ? (
        <div className={styles.notice}>Skriv minst två tecken.</div>
      ) : shown.length === 0 ? (
        <div className={styles.notice}>
          {page > 1 ? 'Inga fler träffar.' : 'Inga träffar.'}
        </div>
      ) : (
        <>
          {shown.map((message) => (
            <article
              key={`${message.channelId}-${message.ts}`}
              className={styles.card}
            >
              <MessageView
                message={message}
                names={names}
                terms={result.terms}
                showChannel
                footer={<ThreadLink message={message} />}
              />
            </article>
          ))}

          <nav className={styles.pages}>
            <span>
              {page > 1 && <Link href={pageHref(page - 1)}>« Nyare</Link>}
            </span>
            <span>
              {result.hasMore && <Link href={pageHref(page + 1)}>Äldre »</Link>}
            </span>
          </nav>
          <p>
            Visar träff {(page - 1) * PAGE_SIZE + 1}–
            {(page - 1) * PAGE_SIZE + shown.length}, nyast först.
          </p>
        </>
      )}
    </div>
  )
}
