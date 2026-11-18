import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { excerpt, renderMrkdwn } from './mrkdwn'
import { parseSearchTerms } from './searchTerms'

const names = {
  users: { U0ANNA: 'Anna' },
  channels: { C0MOMS: 'moms' },
}

const html = (text: string, terms: string[] = []) =>
  render(<p>{renderMrkdwn(text, names, terms)}</p>).container.innerHTML

describe('renderMrkdwn', () => {
  it('shows mentions with names', () => {
    expect(html('Fråga <@U0ANNA> i <#C0MOMS|moms>')).toBe(
      '<p>Fråga <strong>@Anna</strong> i <strong>#moms</strong></p>',
    )
    expect(html('<@U0OKAND> och <!here>')).toBe(
      '<p><strong>@U0OKAND</strong> och <strong>@here</strong></p>',
    )
  })

  it('makes safe links only', () => {
    expect(html('Se <https://example.se/a?b=1&amp;c=2|guiden>')).toBe(
      '<p>Se <a href="https://example.se/a?b=1&amp;c=2" rel="noopener noreferrer nofollow" target="_blank">guiden</a></p>',
    )
    expect(html('<javascript:alert(1)|klicka>')).toBe('<p>klicka</p>')
  })

  it('formats text and code, and escapes the rest', () => {
    expect(html('*fet* _kursiv_ ~struken~ `kod` &lt;b&gt;')).toBe(
      '<p><strong>fet</strong> <em>kursiv</em> <s>struken</s> <code>kod</code> &lt;b&gt;</p>',
    )
    expect(html('```\nconst a = 1 < 2\n```')).toBe(
      '<p><pre><code>const a = 1 &lt; 2\n</code></pre></p>',
    )
  })

  it('marks the search terms', () => {
    expect(html('Bokföring och moms', ['bokför', 'MOMS'])).toBe(
      '<p><mark>Bokför</mark>ing och <mark>moms</mark></p>',
    )
  })
})

describe('excerpt', () => {
  it('keeps short texts whole, and cuts long ones around the match', () => {
    expect(excerpt('kort text', ['text'])).toBe('kort text')

    const long = `${'a '.repeat(500)}moms${' b'.repeat(500)}`
    const cut = excerpt(long, ['moms'], 100)
    expect(cut).toContain('moms')
    expect(cut.startsWith('…')).toBe(true)
    expect(cut.endsWith('…')).toBe(true)
  })
})

describe('parseSearchTerms', () => {
  it('splits words and keeps phrases', () => {
    expect(parseSearchTerms('moms "enskild firma" a moms')).toEqual([
      'moms',
      'enskild firma',
    ])
  })
})
