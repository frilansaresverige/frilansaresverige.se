import Link from 'next/link'
import { connection } from 'next/server'

import ArrowRight from '@/components/ArrowRight'
import { getMemberCount } from '@/lib/memberCount'

import styles from './page.module.css'

const FALLBACK_MEMBER_COUNT = 'flera tusen'

export default async function Home() {
  // Rendered per request so that the member count, which needs a Slack token
  // only available at runtime, is never frozen at build time.
  await connection()
  const memberCount = (await getMemberCount()) ?? FALLBACK_MEMBER_COUNT

  return (
    <div className={styles.container}>
      <p className="description">
        Vi är Sveriges största community för frilansare med {memberCount}{' '}
        medlemmar! Vårt syfte är att främja kontaktskapande och uppdragstipsande
        mellan frilansare.
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

          <Link href="/ansokan" className="primary-button">
            Ansök om medlemskap
            <ArrowRight />
          </Link>
        </div>

        <div className={styles.card}>
          <h2>Vill du ha hjälp med något? &rarr;</h2>
          <p>
            Om du jobbar på ett bolag som har konsultbehov så kan du gratis nå
            ut till {memberCount} frilansare med informationen, utan
            mellanhänder.
          </p>

          <Link href="/uppdrag" className="primary-button">
            Tipsa om konsultuppdrag
            <ArrowRight />
          </Link>
        </div>
      </div>
    </div>
  )
}
