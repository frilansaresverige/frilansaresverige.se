import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  const admins: string[] = [
    'wille@wilhelmeklund.com',
    'pm@annaleijon.se',
    'erik@cheerfulcoders.se',
    'jocke.ekberg@gmail.com',
  ]

  const nbrFreelansers = 500

  return (
    <div className={styles.container}>
      <Head>
        <title>Frilansare Sverige</title>
        <meta
          name="description"
          content="Frilansare Sverige är Sveriges största community för frilansare."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Frilansare Sverige</h1>

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

          <div className={styles.card}>
            <h2>Vill du ha hjälp med något?</h2>
            <p>
              Om du jobbar på ett bolag som har konsultbehov så kan du gratis nå
              ut till över {nbrFreelansers} frilansare med informationen, utan
              mellanhänder.
            </p>
          </div>
        </div>

        <p className={styles.description}>
          Kontakta någon av oss som är administratörer om du är frilansare och
          vill få en inbjudan.
          <ul className={styles.list}>
            {admins.map((email) => (
              <li key={email}>
                <a href={`mailto:${email}?subject=FrilansareSverige`}>
                  {email}
                </a>
              </li>
            ))}
          </ul>
        </p>
      </main>
    </div>
  )
}

export default Home
