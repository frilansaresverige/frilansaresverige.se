import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'

import styles from '../styles/Home.module.css'

const nbrFreelansers = 1600

const ArrowRight = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 13L17.17 13L11.59 18.59L13 20L21 12L13 4L11.59 5.41L17.17 11L3 11V13Z"
      fill="#333333"
    />
  </svg>
)

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Frilansare Sverige</title>
      </Head>

      <p className="description">
        Vi är Sveriges största community för frilansare med över{' '}
        {nbrFreelansers} medlemmar! Vårt syfte är att främja kontaktskapande och
        uppdragstipsande mellan frilansare.
      </p>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Vi hjälper varandra</h2>
          <p>
            Vi hjälper varandra med allt som rör livet som frilansare! T ex hur
            man hittar uppdrag och hur man bokför saker.
          </p>

          <h2>Ett Slack-community</h2>
          <p>Frilansare från hela Sverige är välkomna.</p>

          <Link href="/ansokan">
            <a className="primary-button">
              Ansök om medlemskap
              <ArrowRight />
            </a>
          </Link>
        </div>

        <div className={styles.card}>
          <h2>Vill du ha hjälp med något? &rarr;</h2>
          <p>
            Om du jobbar på ett bolag som har konsultbehov så kan du gratis nå
            ut till över {nbrFreelansers} frilansare med informationen, utan
            mellanhänder.
          </p>

          <Link href="https://uppdrag.frilansaresverige.se/">
            <a className="primary-button">
              Tipsa om konsultuppdrag
              <ArrowRight />
            </a>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
