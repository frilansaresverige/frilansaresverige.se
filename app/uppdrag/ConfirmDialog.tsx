'use client'

import { useEffect, useId, useRef } from 'react'

import styles from './uppdrag.module.css'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busyLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

// A native modal <dialog> handles focus trapping, Escape and the backdrop.
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
}: Props) => {
  const ref = useRef<HTMLDialogElement>(null)
  const headingId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) {
          onCancel()
        }
      }}
    >
      <h2 id={headingId}>{title}</h2>
      <p>{message}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy}
          onClick={onCancel}
          autoFocus
        >
          Avbryt
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
