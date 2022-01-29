import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Title from '../../components/Title'
import styles from './Uppdrag.module.css'

const Uppdrag: NextPage = () => {
  return (
    <div>
      <main>
        <Head>
          <title>Frilansare Sverige - Uppdrag</title>
        </Head>
        <Title>
          <Link href="/">Frilansare Sverige</Link>
        </Title>

        <div className={styles.wrapper}>
          <h2>Vill du ha hjälp med något?</h2>
          <p className={styles.description}>
            Om du jobbar på ett bolag som har konsultbehov så kan du gratis nå
            väldigt många frilansare med informationen, utan mellanhänder.
          </p>

          <p className={styles.description}>
            Vi jobbar på att skapa ett formulär där du kan fylla i information
            om konsultbehov du har. Tills den är klar så kan du maila{' '}
            <a href="mailto:wille@wilhelmeklund.com" className={styles.link}>
              wille@wilhelmeklund.com
            </a>{' '}
            så kommer det publiceras i vår Slack.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Uppdrag
