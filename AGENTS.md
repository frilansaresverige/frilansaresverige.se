# AGENTS.md

frilansaresverige.se (Next.js); see README.md.

## Hosting, deployment and operations

How this app is built, hosted, deployed and monitored follows the shared
practices in the automation repository (github.com/kottnet/automation, `practices/`; locally
`/home/martin/versionskontrollerat/automation/practices/`). Read them before changing the Dockerfile, the deploy script, health
endpoints, logging or anything about where the app runs:

- `deployment.md`: how deploys work, and where the container's configuration
  and secrets live (never in this repository);
- `health-endpoints.md`: `/livez` and `/readyz`;
- `container-images.md`: pinned base images (Node to the patch version),
  `apk upgrade`, small runtime images;
- `hosting.md` and `monitoring.md`.

Here: `./deploy.sh` (deploy-app); the container is `frilansaresverige` in `ansible/host_vars/gredelin/apps.yml`, its secrets in the vault there.

If you change something those files describe, update them too.
