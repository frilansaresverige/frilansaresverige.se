'use client'

import { useState, useTransition, type FormEvent } from 'react'

import { limits } from '@/lib/assignmentFields'

import { addComment, deleteAssignment } from '../actions'
import ConfirmDialog from '../ConfirmDialog'
import styles from '../uppdrag.module.css'

const ManageAssignment = ({ assignmentId }: { assignmentId: string }) => {
  const [comment, setComment] = useState('')
  const [commentSaved, setCommentSaved] = useState(false)
  const [isSavingComment, startSavingComment] = useTransition()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, startDeleting] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submitComment = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startSavingComment(async () => {
      try {
        const result = await addComment(assignmentId, comment)

        if (!result.ok) {
          throw new Error(result.error)
        }

        setComment('')
        setCommentSaved(true)
      } catch {
        setError(
          'Ett oväntat fel inträffade när kompletteringen skulle sparas.',
        )
      }
    })
  }

  const confirmDelete = () => {
    setError(null)

    startDeleting(async () => {
      try {
        const result = await deleteAssignment(assignmentId)

        if (!result.ok) {
          throw new Error(result.error)
        }

        // The page re-renders as deleted, which unmounts this component.
      } catch {
        setIsConfirmingDelete(false)
        setError('Ett oväntat fel inträffade när publikationen skulle raderas.')
      }
    })
  }

  return (
    <>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {commentSaved ? (
        <p role="status">
          <strong>Tack!</strong> Din komplettering har sparats.{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setCommentSaved(false)}
          >
            Skriv en till »
          </button>
        </p>
      ) : (
        <form className={styles.card} onSubmit={submitComment}>
          <label className={styles.field}>
            <span>Komplettera publikationen med ny information:</span>
            <textarea
              className={styles.comment}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={limits.longText}
              disabled={isSavingComment}
              required
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={!comment.trim() || isSavingComment}
          >
            {isSavingComment ? 'Sparar …' : 'Spara komplettering'}
          </button>
        </form>
      )}

      <p>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setIsConfirmingDelete(true)}
        >
          Radera publikationen »
        </button>
      </p>

      <ConfirmDialog
        open={isConfirmingDelete}
        title="Radera publikationen?"
        message="Publikationen slutar visas och meddelandena i Slack raderas. Detta kan inte ångras."
        confirmLabel="Radera"
        busyLabel="Raderar …"
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  )
}

export default ManageAssignment
