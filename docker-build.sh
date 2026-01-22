#!/bin/bash
set -e

echo "🐳 Building Docker image..."
docker build -t djinn-builder .

echo "🏗️  Compiling contract inside Docker..."
# Mount the current directory to /app so artifacts (target/) are written back to host
rm -f programs/djinn-market/Cargo.lock
if [ -f programs/djinn-market/Cargo.lock ]; then
    echo "❌ Cargo.lock STILL EXISTS!"
    exit 1
fi
echo "✅ Cargo.lock deleted."
docker run --rm -v "$(pwd):/app" -w /app/programs/djinn-market -e RUST_MIN_STACK=16777216 djinn-builder sh -c "rm -f Cargo.lock && anchor build"

echo "✅ Build complete! Check target/deploy/ for .so file."
