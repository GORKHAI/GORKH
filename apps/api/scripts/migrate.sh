#!/bin/sh
set -eu

pnpm --filter @gorkh/api exec prisma generate
pnpm --filter @gorkh/api exec prisma migrate deploy
