import type { NextPage } from 'next'
import Image from 'next/image'
import Header from '../components/Header'
import Title from '../components/Title'
import styles from '../styles/Home.module.css'

const nbrFreelansers = 500

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Header />
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

          <a className={styles.card} href="/ansokan">
            <h2>Ansök om medlemskap &rarr;</h2>
            <p>Ansök om medlemskap om du är frilansare!</p>
          </a>

          <div className={styles.card}>
            <h2>Vill du ha hjälp med något?</h2>
            <p>
              Om du jobbar på ett bolag som har konsultbehov så kan du gratis nå
              ut till över {nbrFreelansers} frilansare med informationen, utan
              mellanhänder.
            </p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://github.com/frilansaresverige/frilansaresverige.se/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Bidra till sidan genom vår GitHub 👉
          <span className={styles.logo}>
            <Image
              alt="Github Logo"
              src="https://github.githubassets.com/images/modules/site/icons/footer/github-mark.svg"
              width={20}
              height={20}
            />
          </span>
        </a>
      </footer>
    </div>
  )
}

export default Home
