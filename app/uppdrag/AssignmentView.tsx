import type { SenderType } from '@/lib/assignmentFields'

import styles from './uppdrag.module.css'

export interface AssignmentViewData {
  title: string
  description: string
  customerName: string
  contact: string
  senderType: SenderType | null
  location?: string | null
  clientHourlyRate?: string | number | null
  customerFee?: string | null
  comments?: { id: number; comment: string; created: number }[]
}

const senderTypeNames: Record<SenderType, string> = {
  BROKER: 'förmedlare',
  DIRECT: 'slutkund',
}

const dateFormat = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'long',
  timeZone: 'Europe/Stockholm',
})
const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  timeStyle: 'short',
  timeZone: 'Europe/Stockholm',
})

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  return `den ${dateFormat.format(date)} klockan ${timeFormat.format(date)}`
}

const AssignmentView = ({ assignment }: { assignment: AssignmentViewData }) => {
  const { senderType, location, clientHourlyRate, customerFee } = assignment

  return (
    <article className={`${styles.card} ${styles.assignment}`}>
      <h2>{assignment.title}</h2>

      <dl className={styles.details}>
        {location && (
          <>
            <dt>Plats</dt>
            <dd>{location}</dd>
          </>
        )}
        <dt>Uppdragsgivare</dt>
        <dd>{assignment.customerName}</dd>
        {senderType === 'BROKER' && (
          <>
            <dt>Mellanhandsavgift</dt>
            <dd>{customerFee || 'Vill ej uppge'}</dd>
          </>
        )}
        {clientHourlyRate != null && clientHourlyRate !== '' && (
          <>
            <dt>Maximalt arvode</dt>
            <dd>{clientHourlyRate} kr/h</dd>
          </>
        )}
      </dl>

      <p>{assignment.description}</p>

      <h3>Kontaktuppgifter</h3>
      <p>
        {assignment.contact}
        {senderType && ` (${senderTypeNames[senderType]})`}
      </p>

      {assignment.comments?.map((comment) => (
        <section key={comment.id}>
          <h3>Komplettering {formatTimestamp(comment.created)}</h3>
          <p>{comment.comment}</p>
        </section>
      ))}
    </article>
  )
}

export default AssignmentView
