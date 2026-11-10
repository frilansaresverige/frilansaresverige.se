import { describe, expect, it } from 'vitest'

import { buildHomeView, OPEN_TEMPLATE_ACTION_ID } from './homeView'

const hasEditButton = (view: ReturnType<typeof buildHomeView>) =>
  JSON.stringify(view).includes(OPEN_TEMPLATE_ACTION_ID)

describe('buildHomeView', () => {
  it('shows the template and the edit button to admins only', () => {
    const admin = buildHomeView({
      isAdmin: true,
      template: 'Hej [[INBJUDARE]]!\nAndra raden',
      current: null,
    })
    const member = buildHomeView({
      isAdmin: false,
      template: 'Hej [[INBJUDARE]]!',
      current: null,
    })

    expect(hasEditButton(admin)).toBe(true)
    expect(JSON.stringify(admin)).toContain(
      '> Hej [[INBJUDARE]]!\\n> Andra raden',
    )
    expect(JSON.stringify(admin)).toContain('Standardtexten används.')

    expect(hasEditButton(member)).toBe(false)
    expect(JSON.stringify(member)).not.toContain('[[INBJUDARE]]')
  })

  it('says who last changed the template', () => {
    const view = buildHomeView({
      isAdmin: true,
      template: 'Egen text',
      current: { updated: 1_800_000_000, updatedBy: 'U0ADMIN' },
    })

    expect(JSON.stringify(view)).toContain('Senast ändrad av <@U0ADMIN>')
  })

  it('keeps long templates within Slack’s section limit', () => {
    const view = buildHomeView({
      isAdmin: true,
      template: 'x'.repeat(3000),
      current: null,
    })
    for (const block of view.blocks) {
      if (block.type === 'section') {
        expect(block.text?.text.length).toBeLessThanOrEqual(3000)
      }
    }
  })
})
