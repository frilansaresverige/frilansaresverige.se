#!/bin/bash
set -e

# Start Docker: systemctl on Linux, or Docker Desktop on macOS if that fails.
if ! sudo systemctl start docker 2>/dev/null; then
  open -a Docker
  while ! docker info >/dev/null 2>&1; do sleep 1; done
fi

# Build for the prod server's architecture (amd64), not the local one — building
# on Apple Silicon would otherwise produce an arm64 image the server can't exec.
docker build --platform linux/amd64 -t frilansaresverige-website .
docker save frilansaresverige-website:latest | gzip | ssh gredelin 'gunzip | docker load'
ssh gredelin 'cd /home/martin/frilansaresverige && docker compose up -d'
