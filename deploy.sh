#!/bin/bash
# Tests, build, scan and deploy to gredelin through deploy-app; settings in
# deploy.conf. GOOGLE_ANALYTICS_ID comes from the environment. Also:
#   ./deploy.sh rollback | status
set -e
cd "$(dirname "$0")"
exec deploy-app "$@"
