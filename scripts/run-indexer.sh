#!/bin/bash
# Load .env.local variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
npx ts-node --transpile-only scripts/indexer.ts
