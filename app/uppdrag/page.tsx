import type { Metadata } from 'next'

import AssignmentForm from './AssignmentForm'
import styles from './uppdrag.module.css'

export const metadata: Metadata = {
  title: 'Publicera ett konsultuppdrag',
}

export default function Uppdrag() {
  return (
    <div className={styles.wrapper}>
      <h1>Publicera ett konsultuppdrag</h1>
      <AssignmentForm />
    </div>
  )
}
