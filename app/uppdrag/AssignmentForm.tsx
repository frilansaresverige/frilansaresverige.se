'use client'

import Link from 'next/link'
import { useId, useState, useTransition, type FormEvent } from 'react'

import { limits, type SenderType } from '@/lib/assignmentFields'

import { publishAssignment, type ActionResult } from './actions'
import AssignmentView from './AssignmentView'
import styles from './uppdrag.module.css'

type Step = 'CRAFT' | 'PREVIEW' | 'PUBLISHED'

interface Draft {
  senderType: SenderType | null
  title: string
  location: string
  customerName: string
  customerOrganizationNumber: string
  customerFee: string
  isNonTransparentFee: boolean
  clientHourlyRate: string
  description: string
  contact: string
}

const emptyDraft: Draft = {
  senderType: null,
  title: '',
  location: '',
  customerName: '',
  customerOrganizationNumber: '',
  customerFee: '',
  isNonTransparentFee: false,
  clientHourlyRate: '',
  description: '',
  contact: '',
}

const errorMessages: Record<
  Exclude<ActionResult, { ok: true }>['error'],
  string
> = {
  INVALID_EMAIL_ADDRESS: 'E-postadressen är ogiltig.',
  INVALID_INPUT:
    'Någon av uppgifterna är ogiltig. Gå tillbaka till formuläret och kontrollera dem.',
  NOT_FOUND: 'Ett okänt fel inträffade när uppdraget skulle publiceras.',
}

const parseHourlyRate = (value: string) => {
  const rate = Number.parseInt(value, 10)
  return Number.isNaN(rate) ? null : rate
}

const AssignmentForm = () => {
  const hourlyRateId = useId()
  const [step, setStep] = useState<Step>('CRAFT')
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [emailAddress, setEmailAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPublishing, startPublishing] = useTransition()

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }))

  const goTo = (next: Step) => {
    setError(null)
    setStep(next)
    window.scrollTo(0, 0)
  }

  const isBroker = draft.senderType === 'BROKER'
  const somethingIsMissing =
    !draft.title.trim() ||
    !draft.description.trim() ||
    !draft.customerName.trim() ||
    !draft.contact.trim() ||
    !draft.senderType ||
    (isBroker && !draft.isNonTransparentFee && !draft.customerFee.trim())

  const assignment = {
    senderType: draft.senderType,
    title: draft.title.trim(),
    location: draft.location.trim(),
    customerName: draft.customerName.trim(),
    customerOrganizationNumber: isBroker
      ? draft.customerOrganizationNumber.trim()
      : '',
    customerFee:
      isBroker && !draft.isNonTransparentFee ? draft.customerFee.trim() : null,
    clientHourlyRate: parseHourlyRate(draft.clientHourlyRate),
    description: draft.description.trim(),
    contact: draft.contact.trim(),
  }

  const publish = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startPublishing(async () => {
      try {
        const result = await publishAssignment(
          { ...assignment, senderType: assignment.senderType! },
          emailAddress,
        )

        if (result.ok) {
          goTo('PUBLISHED')
        } else {
          setError(errorMessages[result.error])
        }
      } catch {
        setError('Ett oväntat fel inträffade när uppdraget skulle publiceras.')
      }
    })
  }

  if (step === 'PUBLISHED') {
    return (
      <div role="status">
        <p className={styles.text}>
          Ditt uppdrag har publicerats och en kvittens kommer skickas till den
          angivna e-postadressen. Tack!
        </p>
        <p className={styles.text}>
          Om du vill uppdatera din publikation kan du använda dig av länken i
          kvittensen.
        </p>
      </div>
    )
  }

  if (step === 'PREVIEW') {
    return (
      <>
        <p className={styles.text}>
          Gå igenom det du har skrivit. Om du känner dig nöjd kan du publicera
          uppdraget till frilansargemenskapen.
        </p>

        <AssignmentView assignment={assignment} />

        <p className={styles.text}>
          Vill du ändra något?{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => goTo('CRAFT')}
          >
            Gå tillbaka till formuläret »
          </button>
        </p>

        <form className={styles.card} onSubmit={publish}>
          <p>
            I annat fall, ange din e-postadress för att publicera uppdraget. Du
            kommer få en kvittens skickad till den.
          </p>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <label className={styles.field}>
            <span>Din e-postadress:</span>
            <input
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              maxLength={limits.emailAddress}
              disabled={isPublishing}
              required
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={!emailAddress.trim() || isPublishing}
          >
            {isPublishing ? 'Publicerar …' : 'Publicera'}
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <p className={styles.text}>
        Använd nedanstående formulär för att publicera ett konsultuppdrag till
        svenska frilansare och egenkonsulter.
      </p>

      <p className={styles.text}>
        Vill du veta mer om vad det här är innan du går vidare?{' '}
        <Link href="/uppdrag/information">Läs om den här tjänsten »</Link>
      </p>

      <form
        className={styles.card}
        onSubmit={(event) => {
          event.preventDefault()
          goTo('PREVIEW')
        }}
      >
        <label className={styles.field}>
          <span>Uppdragets titel:</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => update('title', event.target.value)}
            maxLength={limits.title}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Plats:</span>
          <input
            type="text"
            value={draft.location}
            onChange={(event) => update('location', event.target.value)}
            maxLength={limits.location}
            placeholder="t.ex. Remote / Göteborg / Hybrid Stockholm (2dgr/v)"
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>
            Hur kommer frilansarens relation med kunden se ut?
          </legend>

          <label className={styles.choice}>
            <input
              type="radio"
              name="senderType"
              value="BROKER"
              checked={draft.senderType === 'BROKER'}
              onChange={() => update('senderType', 'BROKER')}
              required
            />
            Uppdraget innebär avtal med en förmedlare, som i sin tur har avtal
            med kunden
          </label>

          <label className={styles.choice}>
            <input
              type="radio"
              name="senderType"
              value="DIRECT"
              checked={draft.senderType === 'DIRECT'}
              onChange={() => update('senderType', 'DIRECT')}
            />
            Den vi söker kommer ha direktavtal med kunden
          </label>
        </fieldset>

        <div className={styles.columns}>
          <label className={styles.field}>
            <span>Uppdragsgivarens namn:</span>
            <input
              type="text"
              value={draft.customerName}
              onChange={(event) => update('customerName', event.target.value)}
              maxLength={limits.customerName}
              placeholder="t.ex. företagets namn"
              required
            />
          </label>

          {isBroker && (
            <label className={styles.field}>
              <span>Uppdragsgivarens organisationsnummer:</span>
              <input
                type="text"
                value={draft.customerOrganizationNumber}
                onChange={(event) =>
                  update('customerOrganizationNumber', event.target.value)
                }
                maxLength={limits.customerOrganizationNumber}
                placeholder="123456-7890"
              />
            </label>
          )}
        </div>

        <div className={styles.columns}>
          <div className={styles.field}>
            <label htmlFor={hourlyRateId} className={styles.legend}>
              Högsta arvode till frilansaren:
            </label>
            <span className={styles.withUnit}>
              <input
                id={hourlyRateId}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={draft.clientHourlyRate}
                onChange={(event) =>
                  update('clientHourlyRate', event.target.value)
                }
                placeholder="t.ex. 1000"
              />
              <span className={styles.unit}>kr/h</span>
            </span>
          </div>

          {isBroker && (
            <div className={styles.field}>
              <label>
                <span className={styles.legend}>
                  Vår avgift som mellanhand är:
                </span>
                <input
                  type="text"
                  value={draft.isNonTransparentFee ? '' : draft.customerFee}
                  onChange={(event) =>
                    update('customerFee', event.target.value)
                  }
                  maxLength={limits.customerFee}
                  placeholder="t.ex. 10 % eller 50 kr/h"
                  disabled={draft.isNonTransparentFee}
                  required={!draft.isNonTransparentFee}
                />
              </label>
              <label className={styles.choice}>
                <input
                  type="checkbox"
                  checked={draft.isNonTransparentFee}
                  onChange={(event) =>
                    update('isNonTransparentFee', event.target.checked)
                  }
                />
                Vi är inte transparenta med vår avgift
              </label>
            </div>
          )}
        </div>

        <label className={styles.field}>
          <span>Beskrivning av uppdraget och uppdragsgivarens behov:</span>
          <textarea
            className={styles.description}
            value={draft.description}
            onChange={(event) => update('description', event.target.value)}
            maxLength={limits.longText}
            required
          />
        </label>

        <label className={styles.field}>
          <span>
            Kontaktuppgifter till ansvarig person (namn, telefonnummer m.m.):
          </span>
          <textarea
            className={styles.contact}
            value={draft.contact}
            onChange={(event) => update('contact', event.target.value)}
            maxLength={limits.longText}
            required
          />
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={somethingIsMissing}
        >
          Fortsätt
        </button>
      </form>
    </>
  )
}

export default AssignmentForm
