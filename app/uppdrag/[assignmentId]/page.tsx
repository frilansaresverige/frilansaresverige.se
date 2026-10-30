import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getAssignment, getAssignmentComments } from '@/lib/assignments'

import AssignmentView from '../AssignmentView'
import styles from '../uppdrag.module.css'
import ManageAssignment from './ManageAssignment'

export const dynamic = 'force-dynamic'

// Anyone with the link can edit, so keep it out of search engines.
export const metadata: Metadata = {
  title: 'Hantera publikation',
  robots: { index: false, follow: false },
}

export default async function ManageAssignmentPage({
  params,
}: PageProps<'/uppdrag/[assignmentId]'>) {
  const { assignmentId } = await params
  const assignment = await getAssignment(assignmentId)

  if (assignment === null) {
    notFound()
  }

  if (assignment.deleted !== null) {
    return (
      <div className={styles.wrapper}>
        <h1>Hantera publikation</h1>
        <p>Publikationen har raderats och visas inte längre för andra.</p>
        <div className={styles.card}>
          <h2>{assignment.title}</h2>
          <p className={styles.deleted}>Denna uppdragsannons har raderats.</p>
        </div>
      </div>
    )
  }

  const comments = await getAssignmentComments(assignmentId)

  return (
    <div className={styles.wrapper}>
      <h1>Hantera publikation</h1>
      <p className={styles.text}>
        Du som har länken till publikationen kan på den här sidan lägga till
        kompletteringar. Tänk därför på att hålla länken hemlig!
      </p>

      <AssignmentView assignment={{ ...assignment, comments }} />

      <ManageAssignment assignmentId={assignment.id} />
    </div>
  )
}
