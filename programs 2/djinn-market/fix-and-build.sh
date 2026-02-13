#!/bin/bash
set -e

echo "================================================"
echo "Rust/Anchor Compatibility Fix & Build Script"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo -e "${RED}Error: Anchor.toml not found. Run this from programs/djinn-market/${NC}"
    exit 1
fi

echo "Step 1: Checking Rust version..."
RUST_VERSION=$(rustc --version | awk '{print $2}')
echo "Current Rust version: $RUST_VERSION"

if [[ "$RUST_VERSION" != "1.75.0" ]]; then
    echo -e "${YELLOW}Warning: Rust version is not 1.75.0${NC}"
    echo "The rust-toolchain.toml file should override this for the build."
    echo ""

    # Check if rustup has 1.75.0 installed
    if ! rustup toolchain list | grep -q "1.75.0"; then
        echo "Installing Rust 1.75.0..."
        rustup install 1.75.0
    fi
fi

echo ""
echo "Step 2: Cleaning old build artifacts..."
rm -rf target/
if [ -f "Cargo.lock" ]; then
    echo "Removing Cargo.lock..."
    rm Cargo.lock
fi
cargo clean 2>/dev/null || true

echo ""
echo "Step 3: Checking Cargo.lock version after regeneration..."
# Quick cargo check to regenerate Cargo.lock
cargo check --message-format=short 2>&1 | head -5 || true
sleep 1

if [ -f "Cargo.lock" ]; then
    LOCK_VERSION=$(head -3 Cargo.lock | grep "version" | awk '{print $3}')
    echo "Cargo.lock version: $LOCK_VERSION"

    if [ "$LOCK_VERSION" != "3" ]; then
        echo -e "${RED}ERROR: Cargo.lock is still version $LOCK_VERSION (expected 3)${NC}"
        echo "This means Rust 1.75.0 is not being used."
        echo ""
        echo "Try manually:"
        echo "  rustup override set 1.75.0"
        echo "  cargo clean && rm Cargo.lock"
        exit 1
    else
        echo -e "${GREEN}✓ Cargo.lock is version 3 (correct)${NC}"
    fi
fi

echo ""
echo "Step 4: Verifying dependency pins..."
if grep -q 'wit-bindgen.*=.*0.24.0' Cargo.toml; then
    echo -e "${GREEN}✓ wit-bindgen pinned to 0.24.0${NC}"
else
    echo -e "${RED}✗ wit-bindgen not pinned correctly${NC}"
fi

if grep -q 'solana-program.*=.*1.16.27' Cargo.toml; then
    echo -e "${GREEN}✓ solana-program pinned to 1.16.27${NC}"
else
    echo -e "${RED}✗ solana-program not pinned correctly${NC}"
fi

echo ""
echo "Step 5: Building with Anchor..."
echo "Running: anchor build"
echo ""

if anchor build; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✓ BUILD SUCCESSFUL!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "Program built successfully at:"
    echo "  target/deploy/djinn_market.so"
    echo ""
    echo "IDL generated at:"
    echo "  target/idl/djinn_market.json"
    exit 0
else
    BUILD_EXIT_CODE=$?
    echo ""
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}✗ BUILD FAILED${NC}"
    echo -e "${RED}================================================${NC}"
    echo ""
    echo "Exit code: $BUILD_EXIT_CODE"
    echo ""
    echo "Common issues:"
    echo "  1. Stack overflow in visit_for_abi:"
    echo "     → Try: cargo build-sbf --features no-idl"
    echo ""
    echo "  2. Edition2024 error:"
    echo "     → Check [patch.crates-io] in Cargo.toml"
    echo "     → Ensure wit-bindgen = \"=0.24.0\""
    echo ""
    echo "  3. Cargo.lock version mismatch:"
    echo "     → Run: rustup override set 1.75.0"
    echo "     → Delete Cargo.lock and target/"
    echo ""
    echo "See RUST_ANCHOR_FIX.md for detailed troubleshooting."
    exit $BUILD_EXIT_CODE
fi
