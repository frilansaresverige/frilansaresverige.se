// fribot's Home tab in Slack, drawn for each person who opens it. Only admins
// see the button for editing the reply to invite requests, which is why it
// lives here rather than in a slash command visible to everyone.
export const OPEN_TEMPLATE_ACTION_ID = 'open_invite_template'

// A section's text may be at most 3000 characters.
const MAX_PREVIEW_LENGTH = 2500

const quote = (text: string) =>
  (text.length > MAX_PREVIEW_LENGTH
    ? `${text.slice(0, MAX_PREVIEW_LENGTH)}…`
    : text
  )
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')

export const buildHomeView = ({
  isAdmin,
  template,
  current,
}: {
  isAdmin: boolean
  // The text in use, whether saved or the default.
  template: string
  current: { updated: number; updatedBy: string } | null
}) => ({
  type: 'home',
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Hej, jag är fribot!' },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Jag är Frilansare Sveriges robot. Jag publicerar konsultuppdragen som skickas in via <https://www.frilansaresverige.se/uppdrag|frilansaresverige.se/uppdrag>, och hänvisar den som vill bjuda in någon till communityt till <https://www.frilansaresverige.se/ansokan|ansökningsformuläret>.',
      },
    },
    ...(isAdmin
      ? [
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Svar på inbjudningar* (syns bara för dig som får ändra det)\nDet här skickas privat till den som försöker bjuda in någon via Slack:\n\n${quote(template)}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: current
                  ? `Senast ändrad av <@${current.updatedBy}> <!date^${current.updated}^{date_short_pretty} {time}|${new Date(current.updated * 1000).toISOString()}>.`
                  : 'Standardtexten används.',
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                style: 'primary',
                action_id: OPEN_TEMPLATE_ACTION_ID,
                text: { type: 'plain_text', text: 'Ändra meddelandet' },
              },
            ],
          },
        ]
      : []),
  ],
})
