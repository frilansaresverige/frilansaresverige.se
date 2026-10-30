#!/bin/bash
set -e
cd "$(dirname "$0")"

# Start Docker: systemctl on Linux, or Docker Desktop on macOS if that fails.
if ! sudo systemctl start docker 2>/dev/null; then
  open -a Docker
  while ! docker info >/dev/null 2>&1; do sleep 1; done
fi

# Build for the prod server's architecture (amd64), not the local one — building
# on Apple Silicon would otherwise produce an arm64 image the server can't exec.
# GOOGLE_ANALYTICS_ID is taken from the environment, since it's baked into the
# statically rendered pages.
docker build --platform linux/amd64 \
  --build-arg GOOGLE_ANALYTICS_ID="${GOOGLE_ANALYTICS_ID:-}" \
  -t frilansaresverige-website .
docker save frilansaresverige-website:latest | gzip | ssh gredelin 'gunzip | docker load'
scp deploy/docker-compose.yml gredelin:/home/martin/frilansaresverige/docker-compose.yml
ssh gredelin 'cd /home/martin/frilansaresverige && docker compose up -d'
