import 'server-only'

import { z } from 'zod'

// Each group is parsed on first use rather than at import time, so that
// `next build` works without any secrets and a missing SMTP setting doesn't
// take down unrelated parts of the site.
const lazy = <T>(parse: () => T) => {
  let value: T | undefined
  return () => (value ??= parse())
}

const required = z.string().trim().min(1)
const optional = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional()

export const siteUrl = () =>
  (process.env.SITE_URL || 'https://frilansaresverige.se').replace(/\/+$/, '')

export const isDatabaseConfigured = () => !!process.env.MYSQL_HOST

export const databaseEnv = lazy(() =>
  z
    .object({
      MYSQL_HOST: required,
      MYSQL_PORT: z.coerce.number().int().positive().default(3306),
      MYSQL_USER: required,
      MYSQL_PASSWORD: z.string().default(''),
      MYSQL_DATABASE: required,
    })
    .parse(process.env),
)

export const emailEnv = lazy(() =>
  z
    .object({
      SMTP_HOST: required,
      SMTP_PORT: z.coerce.number().int().positive().default(465),
      SMTP_SECURE: z
        .enum(['true', 'false'])
        .default('true')
        .transform((value) => value === 'true'),
      SMTP_USER: optional,
      SMTP_PASSWORD: optional,
      EMAIL_FROM: required,
      EMAIL_BCC: optional,
      // Sends every e-mail here instead of to the real recipient; for development.
      EMAIL_TO_OVERRIDE: optional,
    })
    .parse(process.env),
)

export const slackEnv = lazy(() =>
  z
    .object({
      SLACK_TOKEN: required,
      SLACK_CHANNEL_BROKER: required,
      SLACK_CHANNEL_DIRECT: required,
      SLACK_MEMBER_COUNT_CHANNEL: required.default('C8P11NBEF'),
      // Lets a staging or test setup talk to a stand-in for Slack.
      SLACK_API_URL: z.url().default('https://slack.com/api'),
    })
    .parse(process.env),
)
