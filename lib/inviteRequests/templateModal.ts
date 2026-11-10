import {
  DEFAULT_REJECTION_TEMPLATE,
  MAX_TEMPLATE_LENGTH,
  placeholders,
} from './template'

export const TEMPLATE_MODAL_CALLBACK_ID = 'invite_rejection_template'
export const TEMPLATE_BLOCK_ID = 'template'
export const TEMPLATE_ACTION_ID = 'body'

const placeholderHelp = Object.entries(placeholders)
  .map(([key, description]) => `\`[[${key}]]\` – ${description}`)
  .join('\n')

// The dialog the Home tab's button opens. Leaving the text empty restores the
// default.
export const buildTemplateModal = (
  current: { body: string; updated: number; updatedBy: string } | null,
) => ({
  type: 'modal',
  callback_id: TEMPLATE_MODAL_CALLBACK_ID,
  title: { type: 'plain_text', text: 'Svar på inbjudningar' },
  submit: { type: 'plain_text', text: 'Spara' },
  close: { type: 'plain_text', text: 'Avbryt' },
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Det här meddelandet skickas privat till den som försöker bjuda in någon via Slack, och hänvisar till ansökningsformuläret.',
      },
    },
    {
      type: 'input',
      block_id: TEMPLATE_BLOCK_ID,
      optional: true,
      label: { type: 'plain_text', text: 'Meddelande' },
      hint: {
        type: 'plain_text',
        text: 'Lämna tomt för att återgå till standardtexten. Slacks formatering (*fetstil*, _kursiv_, länkar) fungerar.',
      },
      element: {
        type: 'plain_text_input',
        action_id: TEMPLATE_ACTION_ID,
        multiline: true,
        max_length: MAX_TEMPLATE_LENGTH,
        initial_value: current?.body ?? DEFAULT_REJECTION_TEMPLATE,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Platshållare:*\n${placeholderHelp}`,
        },
      ],
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
  ],
})
