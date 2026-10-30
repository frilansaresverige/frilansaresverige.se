import { describe, expect, it } from 'vitest'

import { fillTemplate, templates } from './templates'

const siteUrl = 'https://frilansaresverige.se'

const broker = {
  id: 'ABC123',
  senderType: 'BROKER',
  title: 'Backendutvecklare',
  location: 'Remote',
  customerName: 'Kund AB',
  emailAddress: 'a@example.com',
  customerFee: '10 %',
  clientHourlyRate: '900',
  contact: 'Anna\n070-123 45 67',
  description: 'Node och TypeScript',
  customerOrganizationNumber: '556677-8899',
}

describe('fillTemplate', () => {
  it('fills in every field of the initial Slack post', () => {
    expect(fillTemplate(templates.slackAssignmentInitial, broker, siteUrl))
      .toBe(`*Backendutvecklare*

*Plats:* Remote

*Uppdragsgivare:* Kund AB

*Avsändare:* a@example.com

*Mellanhandsavgift:* 10 %

*Maximalt arvode:* 900 kr/h

*Kontaktuppgifter:*
Anna
070-123 45 67`)
  })

  it('leaves out what a direct assignment lacks', () => {
    const text = fillTemplate(
      templates.slackAssignmentInitial,
      {
        ...broker,
        senderType: 'DIRECT',
        customerFee: null,
        clientHourlyRate: null,
        location: '',
      },
      siteUrl,
    )

    expect(text).toBe(`*Backendutvecklare*

*Uppdragsgivare:* Kund AB

*Avsändare:* a@example.com

*Kontaktuppgifter:*
Anna
070-123 45 67`)
  })

  it('says so when a broker withholds their fee', () => {
    expect(
      fillTemplate(
        templates.slackAssignmentInitial,
        { ...broker, customerFee: null },
        siteUrl,
      ),
    ).toContain('*Mellanhandsavgift:* Vill ej uppge')
  })

  it('links to the customer only when there is an organisation number', () => {
    expect(fillTemplate(templates.slackAssignmentThread, broker, siteUrl))
      .toBe(`*Beskrivning:*
Node och TypeScript

*Om uppdragsgivaren:* https://www.allabolag.se/bransch-s%C3%B6k?q=5566778899`)

    expect(
      fillTemplate(
        templates.slackAssignmentThread,
        { ...broker, customerOrganizationNumber: '' },
        siteUrl,
      ),
    ).toBe(`*Beskrivning:*
Node och TypeScript`)
  })

  it('links to the edit page in the confirmation', () => {
    expect(fillTemplate(templates.confirmation, broker, siteUrl)).toContain(
      '\nhttps://frilansaresverige.se/uppdrag/ABC123\n',
    )
  })

  it('keeps user-written text literally', () => {
    const text = fillTemplate(
      templates.slackAssignmentComment,
      { comment: "Pris: $& och $' samt [[TITLE]]" },
      siteUrl,
    )

    expect(text).toBe("*Komplettering*:\nPris: $& och $' samt [[TITLE]]")
  })
})
