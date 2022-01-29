import '../styles/globals.css'

import type { AppProps } from 'next/app'
import Image from 'next/image'

import styles from '../styles/Home.module.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <footer className={styles.footer}>
        <a
          href="https://github.com/frilansaresverige/frilansaresverige.se/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Bidra till sidan genom vår GitHub 👉
          <span className={styles.logo}>
            <Image
              alt="Github Logo"
              src="https://github.githubassets.com/images/modules/site/icons/footer/github-mark.svg"
              width={20}
              height={20}
            />
          </span>
        </a>
      </footer>
    </>
  )
}

export default MyApp
