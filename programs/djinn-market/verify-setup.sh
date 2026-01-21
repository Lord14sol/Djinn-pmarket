#!/bin/bash

echo "================================================"
echo "Rust/Anchor Environment Verification"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Check Rust version
echo "1. Checking Rust version..."
RUST_VERSION=$(rustc --version | awk '{print $2}')
if [[ "$RUST_VERSION" == "1.75.0" ]]; then
    echo -e "   ${GREEN}✓ Rust version: $RUST_VERSION${NC}"
else
    echo -e "   ${RED}✗ Rust version: $RUST_VERSION (expected 1.75.0)${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Check rust-toolchain.toml
echo "2. Checking rust-toolchain.toml..."
if [ -f "rust-toolchain.toml" ]; then
    if grep -q "1.75.0" rust-toolchain.toml; then
        echo -e "   ${GREEN}✓ rust-toolchain.toml exists and specifies 1.75.0${NC}"
    else
        echo -e "   ${YELLOW}⚠ rust-toolchain.toml exists but doesn't specify 1.75.0${NC}"
    fi
else
    echo -e "   ${RED}✗ rust-toolchain.toml not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Check Cargo.toml patches
echo "3. Checking Cargo.toml patches..."
if grep -q "wit-bindgen.*=.*0.24.0" Cargo.toml; then
    echo -e "   ${GREEN}✓ wit-bindgen pinned to 0.24.0${NC}"
else
    echo -e "   ${RED}✗ wit-bindgen not pinned to 0.24.0${NC}"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "solana-program.*=.*1.16.27" Cargo.toml; then
    echo -e "   ${GREEN}✓ solana-program pinned to 1.16.27${NC}"
else
    echo -e "   ${RED}✗ solana-program not pinned to 1.16.27${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Check program Cargo.toml
echo "4. Checking programs/djinn-market/Cargo.toml..."
if grep -q 'solana-program.*=.*1.16.27' programs/djinn-market/Cargo.toml; then
    echo -e "   ${GREEN}✓ solana-program =1.16.27 in program Cargo.toml${NC}"
else
    echo -e "   ${YELLOW}⚠ solana-program version may not be exact${NC}"
fi
echo ""

# 5. Check Cargo.lock version (if exists)
echo "5. Checking Cargo.lock version..."
if [ -f "Cargo.lock" ]; then
    LOCK_VERSION=$(head -3 Cargo.lock | grep "version" | awk '{print $3}')
    if [ "$LOCK_VERSION" == "3" ]; then
        echo -e "   ${GREEN}✓ Cargo.lock version: $LOCK_VERSION${NC}"
    else
        echo -e "   ${RED}✗ Cargo.lock version: $LOCK_VERSION (expected 3)${NC}"
        echo -e "   ${YELLOW}   Run: rm Cargo.lock && cargo check${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "   ${YELLOW}⚠ Cargo.lock not found (will be generated on build)${NC}"
fi
echo ""

# 6. Check Anchor version
echo "6. Checking Anchor version..."
if [ -f "Anchor.toml" ]; then
    ANCHOR_VERSION=$(grep "anchor_version" Anchor.toml | awk -F'"' '{print $2}')
    if [[ "$ANCHOR_VERSION" == "0.28.0" ]]; then
        echo -e "   ${GREEN}✓ Anchor version: $ANCHOR_VERSION${NC}"
    else
        echo -e "   ${YELLOW}⚠ Anchor version: $ANCHOR_VERSION (expected 0.28.0)${NC}"
    fi

    SOLANA_VERSION=$(grep "solana_version" Anchor.toml | awk -F'"' '{print $2}')
    echo -e "   ${GREEN}✓ Solana version: $SOLANA_VERSION${NC}"
else
    echo -e "   ${RED}✗ Anchor.toml not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You should be able to build with:"
    echo "  ./fix-and-build.sh"
    echo "  OR"
    echo "  anchor build"
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo ""
    echo "Fix errors above, then try:"
    echo "  ./fix-and-build.sh"
fi
echo "================================================"

exit $ERRORS
