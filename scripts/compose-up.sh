#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   TAG=dev ./scripts/compose-up.sh                 # uses compose.yml
#   TAG=1.0.0 FILE=compose.deploy.yml ./scripts/compose-up.sh

TAG="${TAG:-dev}"
FILE="${FILE:-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
export TAG

cli=""
if command -v podman >/dev/null 2>&1; then
  cli="podman"
elif command -v docker >/dev/null 2>&1; then
  cli="docker"
else
  echo "No se encontró 'podman' ni 'docker' en PATH. Usa la terminal de Podman Desktop o instala el CLI." >&2
  exit 1
fi

echo "CLI detectado: $cli"

compose_cmd="$cli compose -f $FILE --env-file $ENV_FILE up -d --build"
if [ "$cli" = "podman" ]; then
  if ! $cli compose version >/dev/null 2>&1; then
    if command -v podman-compose >/dev/null 2>&1; then
      compose_cmd="podman-compose -f $FILE --env-file $ENV_FILE up -d --build"
    else
      echo "No se encontró 'podman compose' ni 'podman-compose'." >&2
      exit 1
    fi
  fi
fi

echo "+ $compose_cmd"
exec bash -lc "$compose_cmd"
