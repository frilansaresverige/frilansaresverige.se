'use client'

import classNames from 'classnames'
import { useActionState } from 'react'

import { requestSlackInvitation } from './actions'
import styles from './RequestSlackInvitationForm.module.css'

const RequestSlackInvitationForm = () => {
  const [state, formAction, isPending] = useActionState(
    requestSlackInvitation,
    'IDLE',
  )

  if (state === 'SUCCESS') {
    return (
      <div className={styles['success-box']} role="status">
        Grattis! Din ansökan är inskickad.
      </div>
    )
  }

  return (
    <div className={styles['form-wrapper']}>
      <h1 className={styles['form-title']}>
        Ansök om medlemskap i Slack-gruppen för frilansare
      </h1>

      <p className={styles['form-description']}>
        Vi godkänner bara ansökningar för dig som redan är frilansare.
      </p>

      {state === 'ERROR' && (
        <div className={styles['error-box']} role="alert">
          Något gick fel. Försök igen.
        </div>
      )}

      <form className={styles.form} action={formAction}>
        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="name">
              Namn
            </label>
          </div>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="email">
              E-mail
            </label>
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="howlong">
              Hur länge har du varit frilansare?
            </label>
          </div>
          <input id="howlong" name="howlong" type="text" required />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="companyName">
              Vad heter ditt företag? Eller har du enskild firma?
            </label>
          </div>
          <input id="companyName" name="companyName" type="text" required />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="linkedin">
              Länk till din LinkedIn profil
            </label>
          </div>
          <input id="linkedin" name="linkedin" type="text" required />
        </div>
        <div className={classNames(styles.item, styles.checkboxContainer)}>
          <input
            id="freelancer-confirmation"
            name="freelancer-confirmation"
            type="checkbox"
            className={classNames(styles.flex, styles.checkbox)}
            required
          />
          <label
            className={classNames(styles.label, styles.flex)}
            htmlFor="freelancer-confirmation"
          >
            Jag är igång som frilansare, d v s har ett bolag att fakturera genom
            och tecknat avtal med åtminstone min första kund.
          </label>
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="motivation">
              Motivering (berätta kort om vad du gör och varför du vill vara med
              i vårt community). Observera att vi endast godkänner medlemmar som
              ÄR frilansare.
            </label>
          </div>
          <textarea id="motivation" name="motivation" required></textarea>
        </div>

        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? 'Skickar …' : 'Skicka in ansökan'}
        </button>
      </form>
    </div>
  )
}

export default RequestSlackInvitationForm
