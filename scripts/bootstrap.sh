#!/usr/bin/env bash
set -euo pipefail

cp -n .env.example .env || true
cp -n apps/api/.env.example apps/api/.env || true
cp -n apps/web/.env.local.example apps/web/.env.local || true

echo "Env files bootstrapped. Next:"
echo "1) docker compose up -d"
echo "2) make api-install"
echo "3) make web-install"
