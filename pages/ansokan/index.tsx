import type { NextPage } from 'next'
import Link from 'next/link'
import Header from '../../components/Header'
import Title from '../../components/Title'
import RequestSlackInvitationForm from './RequestSlackInvitationForm'

const Ansokan: NextPage = () => {
  return (
    <div>
      <Header />
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
