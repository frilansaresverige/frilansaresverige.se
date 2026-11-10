import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REJECTION_TEMPLATE,
  renderRejection,
  unknownPlaceholders,
} from './template'
import { buildTemplateModal } from './templateModal'

const values = {
  inviterId: 'U012ABCDEF',
  invitees: ['anna@example.com', 'bo@example.se'],
  applicationUrl: 'https://www.frilansaresverige.se/ansokan',
}

describe('renderRejection', () => {
  it('fills in the placeholders', () => {
    expect(
      renderRejection('[[INBJUDARE]]: [[INBJUDNA]] → [[ANSOKAN_URL]]', values),
    ).toBe(
      '<@U012ABCDEF>: anna@example.com, bo@example.se → https://www.frilansaresverige.se/ansokan',
    )
  })

  it('uses every placeholder in the default text', () => {
    const text = renderRejection(DEFAULT_REJECTION_TEMPLATE, values)

    expect(text).not.toContain('[[')
    expect(text).toContain('<@U012ABCDEF>')
    expect(text).toContain(values.applicationUrl)
  })

  it('leaves unknown placeholders alone', () => {
    expect(renderRejection('[[NAMN]]', values)).toBe('[[NAMN]]')
  })
})

describe('unknownPlaceholders', () => {
  it('lists each unknown placeholder once', () => {
    expect(
      unknownPlaceholders('[[INBJUDARE]] [[NAMN]] [[NAMN]] [[LANK]]'),
    ).toEqual(['NAMN', 'LANK'])
  })
})

describe('buildTemplateModal', () => {
  const field = (modal: ReturnType<typeof buildTemplateModal>) =>
    (modal.blocks[1] as { element: { initial_value: string } }).element
      .initial_value

  it('starts from the saved template, or the default', () => {
    expect(
      field(
        buildTemplateModal({ body: 'Egen text', updated: 1, updatedBy: 'U1' }),
      ),
    ).toBe('Egen text')
    expect(field(buildTemplateModal(null))).toBe(DEFAULT_REJECTION_TEMPLATE)
  })
})
