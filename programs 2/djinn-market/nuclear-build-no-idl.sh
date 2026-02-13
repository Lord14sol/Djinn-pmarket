#!/bin/bash
# NUCLEAR OPTION 1: Build WITHOUT IDL Generation
# This skips the visit_for_abi code that causes stack overflow

set -e

echo "================================================"
echo "NUCLEAR BUILD - Bypass IDL Generation"
echo "================================================"
echo ""

cd "$(dirname "$0")"

# Verify we're in the right place
if [ ! -f "Anchor.toml" ]; then
    echo "ERROR: Must run from programs/djinn-market directory"
    exit 1
fi

# Check Rust version
RUST_VER=$(rustc --version | awk '{print $2}')
echo "Rust version: $RUST_VER"

if [[ ! "$RUST_VER" =~ ^1\.7[5-9] ]]; then
    echo "WARNING: Rust version should be 1.75-1.79"
    echo "Current: $RUST_VER"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 1: Nuclear clean..."
rm -rf target/
rm -f Cargo.lock
cargo clean

echo ""
echo "Step 2: Build with --features no-idl..."
echo "This bypasses the ABI generation that causes stack overflow"
echo ""

cd programs/djinn-market

# Build with no-idl feature
cargo build-sbf --features no-idl

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ BUILD SUCCESS (NO IDL)"
    echo "================================================"
    echo ""
    echo "Program compiled: target/deploy/djinn_market.so"
    ls -lh ../../target/deploy/djinn_market.so
    echo ""
    echo "⚠️  NO IDL FILE GENERATED"
    echo "You'll need to manually create TypeScript types or use:"
    echo "  anchor idl parse --file src/lib.rs > target/idl/djinn_market.json"
    echo ""
    echo "To deploy:"
    echo "  solana program deploy target/deploy/djinn_market.so"
else
    echo ""
    echo "================================================"
    echo "❌ BUILD FAILED"
    echo "================================================"
    exit 1
fi
