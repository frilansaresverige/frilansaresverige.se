import type { NextPage } from 'next'
import Link from 'next/link'
import Title from '../../components/Title'
import RequestSlackInvitationForm from './RequestSlackInvitationForm'

const Ansokan: NextPage = () => {
  return (
    <div>
      <main>
        <Title>
          <Link href="/">Frilansare Sverige</Link>
        </Title>

        <RequestSlackInvitationForm />
      </main>
    </div>
  )
}

export default Ansokan
