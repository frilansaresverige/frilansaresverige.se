// Texts for the confirmation e-mail and the Slack posts. Lines are written
// indented for readability; fillTemplate strips the indentation.
export const templates = {
  confirmation: `
    Hej!

    Det konsultuppdrag med rubriken '[[TITLE]]' som du skickade till Frilansare Sverige har publicerats. Om du vill uppdatera den kan du använda dig av följande länk.
    [[URL]]

    Tänk på att hålla länken hemlig, eftersom vem som helst som har den kan uppdatera publikationen.

    Har du några frågor går det bra att svara på det här e-brevet.

    Hälsningar från Frilansare Sverige
  `,
  slackAssignmentInitial: `
    *[[TITLE]]*

    *Plats:* [[LOCATION]]

    *Uppdragsgivare:* [[CUSTOMER_NAME]]

    *Avsändare:* [[SENDER_EMAIL]]

    *Mellanhandsavgift:* [[CUSTOMER_FEE]]

    *Maximalt arvode:* [[HOURLY_RATE]] kr/h

    *Kontaktuppgifter:*
    [[CONTACT]]
  `,
  slackAssignmentThread: `
    *Beskrivning:*
    [[DESCRIPTION]]

    *Om uppdragsgivaren:* [[CUSTOMER_COMPANY_URL]]
  `,
  slackAssignmentComment: `
    *Komplettering*:
    [[COMMENT]]
  `,
  slackAssignmentDeleted: 'Denna uppdragsannons har raderats.',
  slackAssignmentCommentDeleted: 'Denna komplettering har raderats.',
}

export interface TemplateSource {
  id?: string
  title?: string
  description?: string
  customerName?: string
  contact?: string
  comment?: string
  emailAddress?: string
  location?: string | null
  senderType?: string
  customerOrganizationNumber?: string | null
  clientHourlyRate?: string | null
  customerFee?: string | null
}

export const createCompanyUrl = (organizationNumber: string) =>
  `https://www.allabolag.se/bransch-s%C3%B6k?q=${organizationNumber.replace(/[^A-Za-z0-9]/g, '')}`

export const assignmentUrl = (siteUrl: string, assignmentId: string) =>
  `${siteUrl}/uppdrag/${assignmentId}`

// Removes the line holding the placeholder along with the blank line after it.
const removeLineAndFollowingBlank = (body: string, placeholder: string) =>
  body.replace(
    new RegExp(`^.*\\[\\[${placeholder}\\]\\].*\\r?\\n.*\\r?\\n?`, 'gm'),
    '',
  )

export const fillTemplate = (
  template: string,
  source: TemplateSource,
  siteUrl: string,
) => {
  // Strip the indentation.
  let body = template.trim().replace(/\n[ \t]+/g, '\n')

  if (!source.location) {
    body = removeLineAndFollowingBlank(body, 'LOCATION')
  }

  if (!source.customerOrganizationNumber) {
    body = body.replace(/^.*\[\[CUSTOMER_COMPANY_URL\]\].*\n?/gm, '')
  }

  if (!source.clientHourlyRate) {
    body = removeLineAndFollowingBlank(body, 'HOURLY_RATE')
  }

  if (!source.customerFee && source.senderType === 'DIRECT') {
    body = removeLineAndFollowingBlank(body, 'CUSTOMER_FEE')
  }

  const values: Record<string, string | null | undefined> = {
    TITLE: source.title,
    DESCRIPTION: source.description,
    CUSTOMER_NAME: source.customerName,
    CONTACT: source.contact,
    URL: source.id && assignmentUrl(siteUrl, source.id),
    COMMENT: source.comment,
    SENDER_EMAIL: source.emailAddress,
    LOCATION: source.location,
    CUSTOMER_COMPANY_URL:
      source.customerOrganizationNumber &&
      createCompanyUrl(source.customerOrganizationNumber),
    HOURLY_RATE: source.clientHourlyRate,
    CUSTOMER_FEE: source.customerFee || 'Vill ej uppge',
  }

  // A single pass, so placeholders inside user-written text are left alone.
  body = body.replace(
    /\[\[([A-Z_]+)\]\]/g,
    (_, key: string) => values[key] ?? '',
  )

  return body.trimEnd()
}
