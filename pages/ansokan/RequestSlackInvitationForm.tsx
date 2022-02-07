import { useState } from 'react'
import styles from './RequestSlackInvitationForm.module.css'

import React from "react";
import ReCAPTCHA from "react-google-recaptcha";

const RequestSlackInvitationForm = () => {

  const recaptchaRef = React.createRef();
  const [requestObject, setRequestObject] = useState({});

  const onRecaptchaChange = async (token) => {
    if (!token) {
      return;
    }

    recaptchaRef.current.reset();

    const res = await fetch('/api/request-slack-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestObject),
    })
     const result = await res.json()
     if (result.success) {
      setHasSuccededForm(true)
    }
  }

  const [hasSuccededForm, setHasSuccededForm] = useState(false)

  // @ts-ignore-line
  const submitContact = async (event) => {
    event.preventDefault()

    const name = event.target.name.value
    const email = event.target.email.value
    const howlong = event.target.howlong.value
    const companyName = event.target.companyName.value
    const linkedin = event.target.linkedin.value
    const motivation = event.target.motivation.value

    const requestBody = {
      name,
      email,
      howlong,
      companyName,
      linkedin,
      motivation,
    }

    setRequestObject(requestObject => ({requestBody}));

    await recaptchaRef.current.execute();
  }

  if (hasSuccededForm) {
    return (
      <div className={styles.successBox}>
        Grattis! Din ansökan är inskickad.
      </div>
    )
  }

  return (
    <div className={styles.formWrapper}>
      <p className={styles.description}>
        Ansök om medlemskap om du är frilansare!
      </p>

      <form className={styles.form} onSubmit={submitContact}>
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
            className={styles.input}
            autoComplete="name"
            required
          />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
          </div>
          <input
            id="email"
            name="email"
            type="text"
            className={styles.input}
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
          <input
            id="howlong"
            name="howlong"
            type="text"
            className={styles.input}
            required
          />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="companyName">
              Vad heter ditt företag? Eller har du enskild firma?
            </label>
          </div>
          <input
            id="companyName"
            name="companyName"
            type="text"
            className={styles.input}
            required
          />
        </div>

        <div className={styles.item}>
          <div>
            <label className={styles.label} htmlFor="linkedin">
              Länk till din LinkedIn profil
            </label>
          </div>
          <input
            id="linkedin"
            name="linkedin"
            type="text"
            className={styles.input}
            required
          />
        </div>
        <div className={styles.item}>
          <input
            id="freelancer-confirmation"
            name="freelancer-confirmation"
            type="checkbox"
            required
          />
          <label className={styles.label} htmlFor="freelancer-confirmation">
            Jag är frilansare
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
          <textarea
            id="motivation"
            name="motivation"
            className={styles.input}
            required
          ></textarea>
        </div>
        <ReCAPTCHA
            ref={recaptchaRef}
            size="invisible"
            sitekey="6LeOZGIeAAAAAO5a-O1CsigTlbc_D67Q_unDKlJn"
            onChange={onRecaptchaChange}
        />
        <button type="submit" className={styles.submit}>
          Skicka in ansökan
        </button>
      </form>
    </div>
  )
}

export default RequestSlackInvitationForm
