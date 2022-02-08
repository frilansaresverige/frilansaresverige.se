import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Title from '../../components/Title'
import RequestSlackInvitationForm from './RequestSlackInvitationForm'

const Ansokan: NextPage = () => {
  return (
    <div>
      <main>
        <Head>
          <title>Frilansare Sverige - Ansök om medlemskap</title>
        </Head>

        <RequestSlackInvitationForm />
      </main>
    </div>
  )
}

export default Ansokan
