import './globals.css'

import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import GoogleAnalytics from '@/components/GoogleAnalytics'
import Logo from '@/components/Logo'

import styles from './page.module.css'

export const metadata: Metadata = {
  title: {
    default: 'Frilansare Sverige',
    template: 'Frilansare Sverige - %s',
  },
  description:
    'Frilansare Sverige är Sveriges största community för frilansare.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Inlined at build time; see next.config.ts.
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <div className="page">
          <div className="content">
            <Link
              href="/"
              className="logo-container"
              title="Gå till startsidan"
            >
              <Logo />
            </Link>
            <main>{children}</main>
            <div className="spacer"></div>
          </div>

          <footer className="footer">
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
        </div>
        {googleAnalyticsId && <GoogleAnalytics id={googleAnalyticsId} />}
      </body>
    </html>
  )
}
