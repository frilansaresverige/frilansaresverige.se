import Image from 'next/image'
import Link from 'next/link'

import { renderMrkdwn, type MentionNames } from '@/lib/slackArchive/mrkdwn'

import styles from './arkiv.module.css'

export interface MessageViewData {
  channelId: string
  ts: string
  threadTs: string | null
  text: string
  posted: number
  edited: string | null
  replyCount: number
  channelName: string | null
  authorName: string | null
  avatarUrl: string | null
  deleted?: number | null
  files: {
    id: string
    name: string | null
    title: string | null
    downloaded: boolean
  }[]
}

const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Stockholm',
})

export const threadHref = (message: { channelId: string; ts: string }) =>
  `/arkiv/${message.channelId}/${message.ts}`

const MessageView = ({
  message,
  names,
  terms = [],
  showChannel = false,
  footer,
}: {
  message: MessageViewData
  names: MentionNames
  terms?: string[]
  showChannel?: boolean
  footer?: React.ReactNode
}) => (
  <div className={styles.message}>
    {message.avatarUrl ? (
      <Image
        className={styles.avatar}
        src={message.avatarUrl}
        alt=""
        width={40}
        height={40}
        unoptimized
      />
    ) : (
      <span className={styles.avatar} aria-hidden="true" />
    )}
    <div>
      <div className={styles.meta}>
        <strong>{message.authorName ?? 'Okänd'}</strong>
        {showChannel && message.channelName && <>#{message.channelName} · </>}
        <time dateTime={new Date(message.posted * 1000).toISOString()}>
          {timeFormat.format(message.posted * 1000)}
        </time>
        {message.edited && ' (ändrat)'}
      </div>
      {message.deleted ? (
        <div className={styles.deleted}>Meddelandet har raderats.</div>
      ) : (
        <div className={styles.body}>
          {renderMrkdwn(message.text, names, terms)}
        </div>
      )}
      {message.files.length > 0 && (
        <ul className={styles.files}>
          {message.files.map((file) => (
            <li key={file.id}>
              📎{' '}
              {file.downloaded ? (
                <a href={`/api/arkiv/filer/${file.id}`}>
                  {file.title || file.name || file.id}
                </a>
              ) : (
                <>{file.title || file.name || file.id} (inte nedladdad)</>
              )}
            </li>
          ))}
        </ul>
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  </div>
)

export const ThreadLink = ({ message }: { message: MessageViewData }) => {
  if (message.replyCount > 0) {
    return (
      <Link href={threadHref(message)}>
        Visa tråden ({message.replyCount} svar) »
      </Link>
    )
  }
  if (message.threadTs) {
    return <Link href={threadHref(message)}>Visa hela tråden »</Link>
  }
  return null
}

export default MessageView
