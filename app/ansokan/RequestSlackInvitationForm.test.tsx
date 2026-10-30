import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestSlackInvitation } from './actions'
import RequestSlackInvitationForm from './RequestSlackInvitationForm'

vi.mock('./actions', () => ({ requestSlackInvitation: vi.fn() }))

const fillInAndSubmit = async () => {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Namn'), 'Anna')
  await user.type(screen.getByLabelText('E-mail'), 'anna@example.com')
  await user.type(
    screen.getByLabelText('Hur länge har du varit frilansare?'),
    '2 år',
  )
  await user.type(screen.getByLabelText(/Vad heter ditt företag/), 'Anna AB')
  await user.type(
    screen.getByLabelText('Länk till din LinkedIn profil'),
    'https://linkedin.com/in/anna',
  )
  await user.click(screen.getByLabelText(/Jag är igång som frilansare/))
  await user.type(screen.getByLabelText(/Motivering/), 'Jag frilansar')
  await user.click(screen.getByRole('button', { name: 'Skicka in ansökan' }))
}

describe('RequestSlackInvitationForm', () => {
  beforeEach(() => {
    vi.mocked(requestSlackInvitation).mockReset()
  })

  it('confirms a successful application', async () => {
    vi.mocked(requestSlackInvitation).mockResolvedValue('SUCCESS')
    render(<RequestSlackInvitationForm />)

    await fillInAndSubmit()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Din ansökan är inskickad',
    )
    const formData = vi.mocked(requestSlackInvitation).mock.calls[0]![1]
    expect(formData.get('companyName')).toBe('Anna AB')
  })

  it('lets the applicant try again after a failure', async () => {
    vi.mocked(requestSlackInvitation).mockResolvedValue('ERROR')
    render(<RequestSlackInvitationForm />)

    await fillInAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Något gick fel')
    expect(
      screen.getByRole('button', { name: 'Skicka in ansökan' }),
    ).toBeEnabled()
  })
})
