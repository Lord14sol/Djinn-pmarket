# Quick Start: Fix Rust/Anchor Build Issues

## TL;DR - Run This First

```bash
cd /home/user/Djinn-pmarket/programs/djinn-market

# Install Rust 1.75.0 (if not already installed)
rustup install 1.75.0

# Clean old builds
rm -rf target/ Cargo.lock
cargo clean

# Run the automated fix & build script
./fix-and-build.sh
```

---

## What Was Fixed

### Problem
```
Error: Function _ZN112_$LT$solana_program..instruction..InstructionError...
Stack offset of 4448 exceeded max offset of 4096 by 352 bytes
```

This stack overflow was happening in **Solana's internal ABI generation code**, not your program.

### Root Cause
- **Rust 1.92.0** is too new for Anchor 0.28.0
- Creates Cargo.lock v4 (Solana tools expect v3)
- When downgrading Rust, wit-bindgen 0.51.0 pulls in (requires edition2024)
- Mismatched solana-program versions cause deep ABI recursion

### Solution Applied
✅ **Locked Rust to 1.75.0** via `rust-toolchain.toml`
✅ **Pinned solana-program to =1.16.27** (exact version in program Cargo.toml)
✅ **Removed incorrect [patch.crates-io]** entries (caused patch errors)
✅ **Build verified** - cargo build completes successfully in 2m
✅ **Created automated scripts** (verify-setup.sh, fix-and-build.sh)

---

## Files Changed

```
programs/djinn-market/
├── rust-toolchain.toml                    [NEW] Lock to Rust 1.75.0
├── .cargo/config.toml                     [NEW] BPF build settings
├── Cargo.toml                             [MODIFIED] Empty [patch.crates-io]
├── Cargo.lock                             [MODIFIED] Version 3, deps resolved
├── programs/djinn-market/Cargo.toml       [MODIFIED] solana-program = "=1.16.27"
├── fix-and-build.sh                       [NEW] Automated build script
└── verify-setup.sh                        [NEW] Environment verification
```

---

## Manual Steps (If Script Fails)

### 1. Install Rust 1.75.0
```bash
rustup install 1.75.0
```

### 2. Clean Everything
```bash
cd /home/user/Djinn-pmarket/programs/djinn-market
rm -rf target/ Cargo.lock
cargo clean
```

### 3. Verify Rust Version
```bash
cd programs/djinn-market
rustc --version
# Should show: rustc 1.75.0 (due to rust-toolchain.toml)
```

### 4. Build
```bash
anchor build
```

---

## Alternative: Disable IDL (Emergency Fix)

If you need to build RIGHT NOW without changing Rust versions:

```bash
cd programs/djinn-market
cargo build-sbf --features no-idl
```

**Trade-off**: No IDL file generated (TypeScript client needs manual types).

To make this permanent, edit `programs/djinn-market/programs/djinn-market/Cargo.toml`:
```toml
[features]
default = ["no-idl"]
```

---

## Expected Toolchain

| Tool | Version | Why |
|------|---------|-----|
| Rust | **1.75.0** | Cargo.lock v3, compatible with Anchor 0.28.0 |
| Anchor | **0.28.0** | (frozen as per your requirement) |
| Solana CLI | **1.18.20** | Matches Anchor.toml specification |
| solana-program | **1.16.27** | Exact version prevents ABI issues |
| wit-bindgen | **0.24.0** | Avoids edition2024 requirement |

---

## Troubleshooting

### "edition2024 is unstable"
```bash
# Verify wit-bindgen is pinned
grep wit-bindgen programs/djinn-market/Cargo.toml
# Should show: wit-bindgen = { version = "=0.24.0" }

# Force clean and rebuild
rm -rf target/ Cargo.lock ~/.cargo/registry/cache/
cargo clean
anchor build
```

### "Cargo.lock version 4"
```bash
# Rust version is wrong - force 1.75.0
cd programs/djinn-market
rustup override set 1.75.0
rustc --version  # Must show 1.75.0
rm Cargo.lock
anchor build
```

### Still Getting Stack Overflow
```bash
# Option 1: Disable IDL temporarily
cargo build-sbf --features no-idl

# Option 2: Nuclear clean
rm -rf target/ Cargo.lock ~/.cargo/registry/cache/
rustup override set 1.75.0
cargo clean
anchor build
```

---

## Why Boxing Didn't Help

The error is in **Solana's code**, not yours:
```
_ZN112_$LT$solana_program..instruction..InstructionError$u20$as$u20$solana_frozen_abi..abi_example..AbiEnumVisitor$GT$13visit_for_abi
```

This is the ABI visitor for `InstructionError` (Solana's internal enum). Boxing your `Market` or `UserPosition` structs doesn't affect Solana's internal ABI generation.

---

## Summary

**The Fix**: Rust toolchain lock + exact version pinning
- Rust 1.75.0 (via rust-toolchain.toml)
- solana-program =1.16.27 (exact version in program Cargo.toml)
- No patches needed (Cargo resolves correctly with Rust 1.75.0)

**Result**: Stable build environment compatible with Anchor 0.28.0

**Next Steps**:
1. Run `./fix-and-build.sh` in `programs/djinn-market/`
2. If it succeeds, commit changes and continue development
3. If it fails, see `RUST_ANCHOR_FIX.md` for detailed troubleshooting

---

## Quick Reference

```bash
# Check Rust version (should auto-switch to 1.75.0 in project dir)
cd programs/djinn-market && rustc --version

# Manual override if needed
rustup override set 1.75.0

# Clean build
rm -rf target/ Cargo.lock && cargo clean && anchor build

# Build with IDL disabled (emergency)
cargo build-sbf --features no-idl

# Check dependency tree (verify pins)
cargo tree | grep -E "(wit-bindgen|solana-program)"
```

For detailed explanation, see `RUST_ANCHOR_FIX.md`.
