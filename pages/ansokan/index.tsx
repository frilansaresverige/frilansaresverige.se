import type { NextPage } from 'next'
import Head from 'next/head'
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
