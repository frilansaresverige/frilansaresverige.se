import type { Metadata } from 'next'

import RequestSlackInvitationForm from './RequestSlackInvitationForm'

export const metadata: Metadata = {
  title: 'Ansök om medlemskap',
}

export default function Ansokan() {
  return <RequestSlackInvitationForm />
}
