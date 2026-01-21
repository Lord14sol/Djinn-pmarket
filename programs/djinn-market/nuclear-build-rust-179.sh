#!/bin/bash
# NUCLEAR OPTION 2: Use Rust 1.79.0 (newer stdlib, may resolve deps better)
# This version has better dependency resolution than 1.75.0

set -e

echo "================================================"
echo "NUCLEAR BUILD - Rust 1.79.0 Strategy"
echo "================================================"
echo ""

cd "$(dirname "$0")"

# Check if rustup is available
if ! command -v rustup &> /dev/null; then
    echo "ERROR: rustup not found. Install from https://rustup.rs"
    exit 1
fi

echo "Step 1: Installing Rust 1.79.0..."
rustup install 1.79.0
rustup override set 1.79.0

echo ""
echo "Step 2: Verify Rust version..."
rustc --version

echo ""
echo "Step 3: Nuclear clean..."
rm -rf target/
rm -f Cargo.lock
rm -rf ~/.cargo/registry/index/*
rm -rf ~/.cargo/git/checkouts/wit-bindgen*
cargo clean

echo ""
echo "Step 4: Update rust-toolchain.toml to 1.79.0..."
cat > rust-toolchain.toml <<EOF
[toolchain]
channel = "1.79.0"
components = ["rustfmt", "clippy"]
EOF

echo ""
echo "Step 5: Update dependencies with 1.79.0..."
cargo update

echo ""
echo "Step 6: Check dependency tree for wit-bindgen..."
cargo tree | grep -i wit-bindgen || echo "(wit-bindgen not in tree - good!)"

echo ""
echo "Step 7: Build..."
if command -v anchor &> /dev/null; then
    anchor build
else
    echo "Anchor CLI not found, using cargo build-sbf..."
    cd programs/djinn-market
    cargo build-sbf
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ BUILD SUCCESS with Rust 1.79.0"
    echo "================================================"
    echo ""
    ls -lh target/deploy/djinn_market.so

    if [ -f "target/idl/djinn_market.json" ]; then
        echo ""
        echo "IDL generated:"
        ls -lh target/idl/djinn_market.json
    fi
else
    echo ""
    echo "================================================"
    echo "❌ BUILD FAILED"
    echo "================================================"
    echo ""
    echo "Try NUCLEAR OPTION 1 instead:"
    echo "  ./nuclear-build-no-idl.sh"
    exit 1
fi
