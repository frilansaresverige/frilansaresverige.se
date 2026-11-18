import styles from './arkiv.module.css'

const errors: Record<string, string> = {
  avbruten: 'Inloggningen avbröts.',
  utgangen:
    'Inloggningen tog för lång tid eller kom från fel ställe. Försök igen.',
  misslyckad: 'Inloggningen misslyckades. Försök igen.',
  'fel-workspace':
    'Du måste logga in med ditt konto i Frilansare Sverige på Slack.',
  'ej-medlem': 'Arkivet är bara öppet för communityts medlemmar.',
  'ej-konfigurerad': 'Inloggningen är inte i drift än.',
}

const SignIn = ({ error, next }: { error?: string; next: string }) => (
  <>
    <p>
      Sök bland diskussionerna i Frilansare Sveriges publika Slack-kanaler, även
      de som Slack själv inte längre visar. Arkivet är bara öppet för
      communityts medlemmar, så logga in med ditt Slack-konto.
    </p>

    {error && errors[error] && (
      <div className={styles.error} role="alert">
        {errors[error]}
      </div>
    )}

    <a
      className="primary-button"
      href={`/api/auth/slack/login?next=${encodeURIComponent(next)}`}
    >
      Logga in med Slack
    </a>
  </>
)

export default SignIn
