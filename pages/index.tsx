import type { GetStaticProps, NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'

import styles from '../styles/Home.module.css'

const API_BASE_URL =
  process.env.API_BASE_URL || 'https://uppdrag.frilansaresverige.se/api'
const MEMBER_COUNT_API = `${API_BASE_URL}/member-count`
const FALLBACK_MEMBER_COUNT = 'flera tusen'
const FETCH_TIMEOUT_MS = 1000

async function fetchMemberCount(): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(MEMBER_COUNT_API, {
      signal: controller.signal,
    })

    if (!response.ok) {
      return FALLBACK_MEMBER_COUNT
    }

    const text = await response.text()
    const count = parseInt(text.trim(), 10)

    if (isNaN(count)) {
      return FALLBACK_MEMBER_COUNT
    }

    return count.toString()
  } catch {
    return FALLBACK_MEMBER_COUNT
  } finally {
    clearTimeout(timeoutId)
  }
}

interface HomeProps {
  memberCount: string
}

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

const Home: NextPage<HomeProps> = ({ memberCount }) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Frilansare Sverige</title>
      </Head>

      <p className="description">
        Vi är Sveriges största community för frilansare med {memberCount}{' '}
        medlemmar! Vårt syfte är att främja kontaktskapande och
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
            ut till {memberCount} frilansare med informationen, utan
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

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const memberCount = await fetchMemberCount()

  return {
    props: {
      memberCount,
    },
    revalidate: 3600,
  }
}

export default Home
