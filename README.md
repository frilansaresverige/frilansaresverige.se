# FrilansareSverige.se

This is the Git repo for the page https://frilansaresverige.se/, including the
form for publishing consulting assignments (`/uppdrag`), which used to live on
uppdrag.frilansaresverige.se.

## Getting Started with development

This is a [Next.js](https://nextjs.org/) project (App Router, TypeScript) that
runs on Node.js 26 (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # fill in what you need
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The start page and the membership application work without any configuration.
The assignment form needs a MySQL database with the tables from the old
uppdrag repository's `backend/structure.sql`, and SMTP and Slack settings for
the confirmation e-mails and the Slack posts.

Other useful commands:

```bash
npm test            # Vitest
npm run lint
npm run typecheck
npm run prettier:write
```

## How the assignment form works

- `app/uppdrag` holds the pages; `app/uppdrag/actions.ts` the server actions
  that save assignments, comments and deletions.
- Slack posts and the confirmation e-mail are sent after the response
  (`after()`), from `lib/slack.ts` and `lib/email.ts`. The texts are in
  `lib/templates.ts`.
- Anything that didn't reach Slack is retried when the server starts
  (`instrumentation.ts`).
- The edit link (`/uppdrag/<id>`) is the only credential, so it is never
  indexed and is masked in Google Analytics.
- Old links to uppdrag.frilansaresverige.se are permanently redirected by the
  Nginx reverse proxy on karmosin.

## Database

`lib/db/schema.ts` describes the existing tables for
[Drizzle](https://orm.drizzle.team/); the application never alters them.
Possible improvements, none of them required:

- `assignmentComment.id` is computed as `COUNT(*) + 1` when inserting, so two
  comments saved at the same moment on the same assignment collide on the
  primary key and one of them fails. An `AUTO_INCREMENT` id would avoid that.
- `assignment.created`/`deleted` are Unix seconds in `bigint`; `DATETIME` or
  `TIMESTAMP` columns would be easier to read and query.
- `clientHourlyRate` is a `varchar(20)` although only integers are stored;
  an `INT UNSIGNED` would allow sorting and filtering.
- `slackChannel` stores a channel name (e.g. `#uppdrag`), which breaks if the
  channel is renamed before an assignment reaches Slack. Storing the channel
  id instead would also make `slackChannelId` unnecessary.
- An index on `assignment.slackId` and on `(deleted, slackDeleted)` would keep
  the startup sync cheap as the table grows.
- Deleted assignments keep their personal data (e-mail address, contact
  details) indefinitely. Clearing those columns some time after deletion
  would be kinder under GDPR.

## Deployment

`deploy.sh` builds the Docker image, copies it and `deploy/docker-compose.yml`
to gredelin and restarts it with `docker compose`. Configuration is read from
an `.env` file next to the compose file on the server (see `.env.example`).
The Nginx on karmosin proxies www.frilansaresverige.se to it and must pass on
the `Host` header, which server actions check against `Origin`.
`GOOGLE_ANALYTICS_ID` is a build argument instead, as it ends up in the
statically rendered pages.

## Contributions

Bring your ideas to #frilansaresverigese in our Slack.

Fork & pull request - make sure to attach a screenshot of the effect of your change so it is easy to review 👍
