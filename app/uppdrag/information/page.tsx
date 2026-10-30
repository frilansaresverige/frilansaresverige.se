import type { Metadata } from 'next'
import Link from 'next/link'

import styles from '../uppdrag.module.css'

export const metadata: Metadata = {
  title: 'Om att publicera konsultuppdrag',
}

export default function Information() {
  return (
    <div className={styles.wrapper}>
      <h1>Information om den här tjänsten</h1>

      <div className={styles.text}>
        <p>
          Med hjälp av formuläret kan du publicera aktuella it-konsultuppdrag.
          De uppdrag som publiceras når en svensk gemenskap där över tusen
          frilansare och egenkonsulter inom it-branschen är medlemmar.
        </p>

        <p>
          Eftersom gemenskapen är exklusiv för frilansare och egenkonsulter är
          det här formuläret vägen in om du vill nå ut med något till den. Se
          till att lämna dina kontaktuppgifter när du publicerar ett uppdrag, så
          att de medlemmar som är intresserade kan nå dig eller företaget du
          företräder.
        </p>

        <p>
          Oavsett om du har kontakt med konsultbolag och/eller -mäklare är det
          allt som oftast en bra idé att publicera aktuella konsultuppdrag även
          här. Det kan leda till att du når ut till fler kvalificerade
          konsulter, och genom att inte gå via ett konsultbolag eller -mäklare
          kan villkoren eventuellt bli bättre.
        </p>

        <p>
          <Link href="/uppdrag">Gå till uppdragsformuläret »</Link>
        </p>
      </div>
    </div>
  )
}
