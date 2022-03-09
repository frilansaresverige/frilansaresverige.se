import type { NextPage } from 'next'
import Head from 'next/head'
import RequestSlackInvitationForm from './RequestSlackInvitationForm'

const Ansokan: NextPage = () => {
  return (
    <>
      <Head>
        <title>Frilansare Sverige - Ansök om medlemskap</title>
      </Head>

      <RequestSlackInvitationForm />
    </>
  )
}

export default Ansokan
