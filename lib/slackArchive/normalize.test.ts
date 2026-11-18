import { describe, expect, it } from 'vitest'

import {
  archivableFiles,
  compareTs,
  decideChange,
  safeFileName,
  toMessageRow,
  type SlackApiMessage,
} from './normalize'

const message: SlackApiMessage = {
  type: 'message',
  user: 'U0ANNA',
  ts: '1800000000.000100',
  text: 'Hej alla!',
  reactions: [{ name: 'wave', users: ['U0BO'] }],
}

const row = (overrides: Partial<SlackApiMessage> = {}) =>
  toMessageRow('C0GENERAL', { ...message, ...overrides }, 1_800_000_500)

describe('compareTs', () => {
  it('orders Slack timestamps exactly', () => {
    expect(compareTs('1800000000.000100', '1800000000.000099')).toBe(1)
    expect(compareTs('1800000000.000100', '1800000000.000100')).toBe(0)
    expect(compareTs('1799999999.999999', '1800000000.000000')).toBe(-1)
    // A float would lose the difference in the last digit.
    expect(compareTs('1800000000.123457', '1800000000.123456')).toBe(1)
  })
})

describe('toMessageRow', () => {
  it('keeps the message but not its reactions', () => {
    const result = row()

    expect(result).toMatchObject({
      channelId: 'C0GENERAL',
      ts: '1800000000.000100',
      threadTs: null,
      userId: 'U0ANNA',
      text: 'Hej alla!',
      posted: 1_800_000_000,
    })
    expect(result.raw).not.toHaveProperty('reactions')
  })

  it('links replies and thread starts to their thread', () => {
    expect(
      row({ ts: '1800000001.000000', thread_ts: '1800000000.000100' }).threadTs,
    ).toBe('1800000000.000100')
    expect(
      row({ thread_ts: '1800000000.000100', reply_count: 3 }).threadTs,
    ).toBe('1800000000.000100')
  })
})

describe('decideChange', () => {
  const stored = (overrides = {}) => {
    const current = row()
    return {
      text: current.text,
      edited: current.edited,
      deleted: null,
      raw: current.raw,
      ...overrides,
    }
  }

  it('inserts what isn’t stored', () => {
    expect(decideChange(null, row())).toBe('insert')
  })

  it('only refreshes when the content is the same', () => {
    expect(decideChange(stored(), row({ reply_count: 4 }))).toBe('refresh')
    // Reactions are ignored altogether.
    expect(decideChange(stored(), row({ reactions: [] }))).toBe('refresh')
  })

  it('keeps a revision when the text or the files change', () => {
    expect(
      decideChange(
        stored(),
        row({ text: 'Hej allihop!', edited: { ts: '1800000100.000000' } }),
      ),
    ).toBe('revise')
    expect(decideChange(stored(), row({ files: [{ id: 'F0NEW' }] }))).toBe(
      'revise',
    )
  })

  it('ignores a version older than the stored one', () => {
    const edited = stored({
      text: 'Andra versionen',
      edited: '1800000200.000000',
    })

    expect(decideChange(edited, row())).toBe('ignore')
    expect(
      decideChange(
        edited,
        row({ text: 'Första ändringen', edited: { ts: '1800000100.000000' } }),
      ),
    ).toBe('ignore')
    expect(
      decideChange(
        edited,
        row({ text: 'Tredje', edited: { ts: '1800000300.000000' } }),
      ),
    ).toBe('revise')
  })

  it('leaves deleted messages deleted', () => {
    expect(
      decideChange(stored({ deleted: 1_800_000_400, text: '' }), row()),
    ).toBe('ignore')
  })
})

describe('archivableFiles', () => {
  it('skips deleted files and those hidden by the Free plan', () => {
    expect(
      archivableFiles({
        ...message,
        files: [
          { id: 'F1', name: 'cv.pdf' },
          { id: 'F2', mode: 'tombstone' },
          { id: 'F3', mode: 'hidden_by_limit' },
        ],
      }).map((file) => file.id),
    ).toEqual(['F1'])
  })
})

describe('safeFileName', () => {
  it('keeps names recognisable but harmless', () => {
    expect(safeFileName('Offert för uppdrag.pdf', 'F1')).toBe(
      'Offert för uppdrag.pdf',
    )
    const escaped = safeFileName('../../etc/passwd', 'F1')
    expect(escaped).not.toContain('/')
    expect(escaped).not.toMatch(/^\./)
    expect(safeFileName('', 'F1')).toBe('F1')
    expect(safeFileName(null, 'F1')).toBe('F1')
  })
})
