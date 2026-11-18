import { Fragment, type ReactNode } from 'react'

// Renders Slack's message formatting ("mrkdwn") as React elements, never as
// HTML, so a message can't inject anything into the page:
// https://docs.slack.dev/messaging/formatting-message-text

export interface MentionNames {
  users: Record<string, string>
  channels: Record<string, string>
}

const decodeEntities = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Marks the search terms in plain text.
const highlight = (text: string, terms: string[], key: string): ReactNode => {
  if (terms.length === 0 || !text) {
    return text
  }
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  return text
    .split(pattern)
    .map((part, i) =>
      i % 2 === 1 ? <mark key={`${key}-${i}`}>{part}</mark> : part,
    )
}

const isSafeUrl = (url: string) => /^(https?:|mailto:)/i.test(url)

// One <…> token: a mention, a channel, a special mention or a link.
const renderToken = (
  token: string,
  names: MentionNames,
  terms: string[],
  key: string,
): ReactNode => {
  const [target = '', label] = token.split('|', 2)

  if (target.startsWith('@')) {
    const id = target.slice(1)
    return <strong key={key}>@{names.users[id] ?? label ?? id}</strong>
  }
  if (target.startsWith('#')) {
    const id = target.slice(1)
    return <strong key={key}>#{names.channels[id] ?? label ?? id}</strong>
  }
  if (target.startsWith('!')) {
    const special = target.slice(1).split('^')[0]
    return (
      <strong key={key}>{label ? decodeEntities(label) : `@${special}`}</strong>
    )
  }

  const url = decodeEntities(target)
  const text = label ? decodeEntities(label) : url.replace(/^mailto:/, '')
  if (!isSafeUrl(url)) {
    return highlight(text, terms, key)
  }
  return (
    <a key={key} href={url} rel="noopener noreferrer nofollow" target="_blank">
      {highlight(text, terms, key)}
    </a>
  )
}

// *bold*, _italic_, ~strike~ and `code`, not nested.
const INLINE = /(`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g

const renderInline = (text: string, terms: string[], key: string) =>
  text.split(INLINE).map((part, i) => {
    const k = `${key}-i${i}`
    if (i % 2 === 0) {
      return (
        <Fragment key={k}>{highlight(decodeEntities(part), terms, k)}</Fragment>
      )
    }
    const inner = decodeEntities(part.slice(1, -1))
    switch (part[0]) {
      case '`':
        return <code key={k}>{inner}</code>
      case '*':
        return <strong key={k}>{highlight(inner, terms, k)}</strong>
      case '_':
        return <em key={k}>{highlight(inner, terms, k)}</em>
      default:
        return <s key={k}>{highlight(inner, terms, k)}</s>
    }
  })

// A stretch of text without code blocks.
const renderText = (
  text: string,
  names: MentionNames,
  terms: string[],
  key: string,
) =>
  text
    .split(/<([^<>\n]+)>/g)
    .map((part, i) =>
      i % 2 === 1 ? (
        renderToken(part, names, terms, `${key}-t${i}`)
      ) : (
        <Fragment key={`${key}-t${i}`}>
          {renderInline(part, terms, `${key}-t${i}`)}
        </Fragment>
      ),
    )

export const renderMrkdwn = (
  text: string,
  names: MentionNames,
  terms: string[] = [],
): ReactNode =>
  text.split(/```([\s\S]*?)```/g).map((part, i) =>
    i % 2 === 1 ? (
      <pre key={`b${i}`}>
        <code>{decodeEntities(part.replace(/^\n/, ''))}</code>
      </pre>
    ) : (
      <Fragment key={`b${i}`}>
        {renderText(part, names, terms, `b${i}`)}
      </Fragment>
    ),
  )

// A shorter version for search results: around the first match.
export const excerpt = (text: string, terms: string[], length = 600) => {
  if (text.length <= length) {
    return text
  }

  const lower = text.toLowerCase()
  const first = Math.min(
    ...terms
      .map((term) => lower.indexOf(term.toLowerCase()))
      .filter((index) => index >= 0),
    Number.POSITIVE_INFINITY,
  )
  const start = Number.isFinite(first) ? Math.max(0, first - length / 3) : 0
  // Not in the middle of a <…> token.
  const safeStart =
    text.lastIndexOf('>', start) < text.lastIndexOf('<', start)
      ? text.lastIndexOf('<', start)
      : start
  const end = Math.min(text.length, safeStart + length)

  return `${safeStart > 0 ? '…' : ''}${text.slice(safeStart, end)}${end < text.length ? '…' : ''}`
}
