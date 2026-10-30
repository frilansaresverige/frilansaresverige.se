import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { publishAssignment } from './actions'
import AssignmentForm from './AssignmentForm'

vi.mock('./actions', () => ({ publishAssignment: vi.fn() }))

const fillInDirectAssignment = async () => {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Uppdragets titel:'), 'Utvecklare')
  await user.click(
    screen.getByLabelText('Den vi söker kommer ha direktavtal med kunden'),
  )
  await user.type(screen.getByLabelText('Uppdragsgivarens namn:'), 'Kund AB')
  await user.type(
    screen.getByLabelText('Högsta arvode till frilansaren:'),
    '1000',
  )
  await user.type(
    screen.getByLabelText(/Beskrivning av uppdraget/),
    'Bygga saker',
  )
  await user.type(screen.getByLabelText(/Kontaktuppgifter/), 'Anna')

  return user
}

describe('AssignmentForm', () => {
  beforeEach(() => {
    vi.mocked(publishAssignment).mockReset()
    window.scrollTo = vi.fn()
  })

  it('previews and publishes an assignment', async () => {
    vi.mocked(publishAssignment).mockResolvedValue({ ok: true })
    render(<AssignmentForm />)

    const continueButton = screen.getByRole('button', { name: 'Fortsätt' })
    expect(continueButton).toBeDisabled()

    const user = await fillInDirectAssignment()
    await user.click(continueButton)

    expect(screen.getByRole('heading', { name: 'Utvecklare' })).toBeVisible()
    expect(screen.getByText('1000 kr/h')).toBeVisible()

    await user.type(
      screen.getByLabelText('Din e-postadress:'),
      'anna@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Publicera' }))

    expect(publishAssignment).toHaveBeenCalledWith(
      {
        senderType: 'DIRECT',
        title: 'Utvecklare',
        location: '',
        customerName: 'Kund AB',
        customerOrganizationNumber: '',
        customerFee: null,
        clientHourlyRate: 1000,
        description: 'Bygga saker',
        contact: 'Anna',
      },
      'anna@example.com',
    )
    expect(
      await screen.findByText(/Ditt uppdrag har publicerats/),
    ).toBeVisible()
  })

  it('requires brokers to state their fee or that they withhold it', async () => {
    render(<AssignmentForm />)
    const user = await fillInDirectAssignment()

    await user.click(screen.getByLabelText(/avtal med en förmedlare/))
    const continueButton = screen.getByRole('button', { name: 'Fortsätt' })
    expect(continueButton).toBeDisabled()

    await user.click(
      screen.getByLabelText('Vi är inte transparenta med vår avgift'),
    )
    expect(continueButton).toBeEnabled()
  })

  it('shows why publishing failed', async () => {
    vi.mocked(publishAssignment).mockResolvedValue({
      ok: false,
      error: 'INVALID_EMAIL_ADDRESS',
    })
    render(<AssignmentForm />)
    const user = await fillInDirectAssignment()
    await user.click(screen.getByRole('button', { name: 'Fortsätt' }))

    await user.type(screen.getByLabelText('Din e-postadress:'), 'a@b.co')
    await user.click(screen.getByRole('button', { name: 'Publicera' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-postadressen är ogiltig.',
    )
  })
})
