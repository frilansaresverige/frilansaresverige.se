import type { NextPage } from 'next'
import Link from 'next/link'

import Title from '../components/Title'
import styles from '../styles/Home.module.css'

const nbrFreelansers = 500

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Title>Frilansare Sverige</Title>

        <p className={styles.description}>
          Vi är Sveriges största community för frilansare med över{' '}
          {nbrFreelansers} medlemmar! Vårt syfte är att främja kontaktskapande
          och uppdragstipsande mellan frilansare.
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Ett Slack-community</h2>
            <p>Frilansare från hela Sverige är välkomna.</p>
          </div>

          <div className={styles.card}>
            <h2>Vi hjälper varandra</h2>
            <p>
              Vi hjälper varandra med allt som rör livet som frilansare! T ex
              hur man hittar uppdrag och hur man bokför saker.
            </p>
          </div>

          <Link href="/ansokan">
            <a className={styles.card}>
              <h2>Ansök om medlemskap &rarr;</h2>
              <p>Ansök om medlemskap om du är frilansare!</p>
            </a>
          </Link>

          <Link href="/uppdrag">
            <a className={styles.card}>
              <h2>Vill du ha hjälp med något? &rarr;</h2>
              <p>
                Om du jobbar på ett bolag som har konsultbehov så kan du gratis
                nå ut till över {nbrFreelansers} frilansare med informationen,
                utan mellanhänder.
              </p>
            </a>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Home
