#!/bin/bash
# NUCLEAR OPTION 3: Incremental dependency build
# Temporarily removes problematic deps, builds core, then adds back

set -e

echo "================================================"
echo "NUCLEAR BUILD - Incremental Dependency Strategy"
echo "================================================"
echo ""

cd "$(dirname "$0")"

# Backup original Cargo.toml
echo "Step 1: Backing up Cargo.toml files..."
cp programs/djinn-market/Cargo.toml programs/djinn-market/Cargo.toml.backup

echo ""
echo "Step 2: Creating minimal Cargo.toml (no mpl-token-metadata)..."
cat > programs/djinn-market/Cargo.toml <<'EOF'
[package]
name = "djinn-market"
version = "0.1.0"
description = "Created with Anchor"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "djinn_market"

[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
anchor-debug = []
custom-heap = []
custom-panic = []

[dependencies]
anchor-lang = { version = "0.28.0", features = ["init-if-needed"] }
anchor-spl = { version = "0.28.0" }
# mpl-token-metadata temporarily removed
rmp-serde = "=1.3.0"
rmp = "=0.8.14"
borsh = "=0.10.3"
borsh-derive = "=0.10.3"
blake3 = "=1.5.1"
solana-program = "=1.16.27"
uint = "0.9.5"
EOF

echo ""
echo "Step 3: Nuclear clean..."
rm -rf target/
rm -f Cargo.lock
cargo clean

echo ""
echo "Step 4: Build without mpl-token-metadata..."
cd programs/djinn-market
if cargo build-sbf --features no-idl; then
    echo ""
    echo "✅ Core build succeeded without mpl-token-metadata"
else
    echo ""
    echo "❌ Core build failed - fundamental issue"
    echo "Restoring original Cargo.toml..."
    mv Cargo.toml.backup Cargo.toml
    exit 1
fi

echo ""
echo "Step 5: Restoring original Cargo.toml with mpl-token-metadata..."
mv Cargo.toml.backup Cargo.toml

echo ""
echo "Step 6: Clean again..."
cd ../..
rm -rf target/
rm -f Cargo.lock
cargo clean

echo ""
echo "Step 7: Full build with all dependencies..."
cd programs/djinn-market
cargo build-sbf --features no-idl

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ FULL BUILD SUCCESS"
    echo "================================================"
    echo ""
    ls -lh ../../target/deploy/djinn_market.so
else
    echo ""
    echo "================================================"
    echo "❌ Full build failed"
    echo "================================================"
    echo ""
    echo "The core builds without mpl-token-metadata."
    echo "Issue is in the mpl-token-metadata dependency chain."
    echo ""
    echo "Try:"
    echo "1. Downgrade mpl-token-metadata to 1.11.0"
    echo "2. Remove mpl-token-metadata if not needed"
    exit 1
fi
