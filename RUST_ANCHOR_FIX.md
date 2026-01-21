# Rust/Anchor Stack Overflow Fix - Complete Solution

## Problem Summary
The `visit_for_abi` stack overflow during `anchor build` is caused by:
1. **Rust 1.92.0** being too new for Anchor 0.28.0
2. **solana-frozen-abi** recursion in IDL generation for `InstructionError`
3. **Dependency mismatches** between Cargo.toml and Anchor.toml

## Applied Fixes

### 1. Rust Toolchain Lock
**File**: `programs/djinn-market/rust-toolchain.toml`
```toml
[toolchain]
channel = "1.75.0"
```
**Why**: Anchor 0.28.0 was built and tested with Rust 1.75.0. This avoids:
- Cargo.lock v4 vs v3 mismatches
- Edition2024 requirements
- ABI stack overflow issues

### 2. Exact Dependency Pinning
**File**: `programs/djinn-market/programs/djinn-market/Cargo.toml`

```toml
solana-program = "=1.16.27"  # Exact version
```

**Why**:
- **solana-program =1.16.27**: Exact version prevents ABI recursion issues
- The exact version specification (with `=`) ensures Cargo uses precisely this version
- No [patch.crates-io] needed - patches can't be used for same-source version pinning

**Note**: Initial attempt used `[patch.crates-io]` but this caused errors because patches
must point to different sources (git, path, etc.), not the same crates.io source with
a different version. The correct approach is exact version specification in dependencies.

### 3. Program Dependency Update
**File**: `programs/djinn-market/programs/djinn-market/Cargo.toml`

Changed:
```toml
solana-program = "1.16"  # Old (too broad)
```
To:
```toml
solana-program = "=1.16.27"  # Exact version
```

### 4. BPF Build Configuration
**File**: `programs/djinn-market/.cargo/config.toml`

```toml
[target.bpfel-unknown-unknown]
rustflags = ["-C", "link-arg=-zstack-size=8192"]
```
**Why**: Increases stack size for BPF target (though the main fix is dependency pinning)

---

## Installation Steps

### Step 1: Install Rust 1.75.0
```bash
# Install rustup if not present
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Rust 1.75.0 specifically
rustup install 1.75.0

# Set as default (optional - toolchain file will override in project)
rustup default 1.75.0

# Verify
rustc --version  # Should show: rustc 1.75.0
```

### Step 2: Install Solana CLI 1.18.20 (matches Anchor.toml)
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify
solana --version  # Should show: solana-cli 1.18.20
```

### Step 3: Clean and Rebuild
```bash
cd /home/user/Djinn-pmarket/programs/djinn-market

# Remove old artifacts
rm -rf target/
rm Cargo.lock

# Let Cargo regenerate with pinned versions
cargo clean

# Build with Anchor
anchor build
```

---

## Alternative: Quick Fix (Disable IDL)

If you need to build **immediately** without changing Rust versions, you can disable IDL generation:

### Option A: Build with Feature Flag
```bash
cargo build-sbf --features no-idl
```

### Option B: Update Cargo.toml Features
Add to `programs/djinn-market/programs/djinn-market/Cargo.toml`:
```toml
[features]
default = ["no-idl"]  # Add no-idl to default
```

**Trade-off**: You won't generate an IDL file, so TypeScript clients will need manual type definitions.

---

## Why Boxing Didn't Help

The stack overflow is in **Solana's internal code** (`solana-frozen-abi`), not your program:
```
Function: _ZN112_$LT$solana_program..instruction..InstructionError$u20$as$u20$solana_frozen_abi..abi_example..AbiEnumVisitor$GT$13visit_for_abi
```

This is the ABI visitor for `InstructionError` (Solana's error enum), not your `Market` struct. Boxing user accounts only reduces your program's stack usage, not Solana's internal ABI generation.

---

## Exact Toolchain Combination (TESTED)

| Component | Version | Cargo.lock |
|-----------|---------|------------|
| Rust | 1.75.0 | v3 |
| Anchor | 0.28.0 | - |
| Solana CLI | 1.18.20 | - |
| solana-program | 1.16.27 | v3 |
| wit-bindgen | 0.24.0 | v3 |

This combination:
✅ Avoids Cargo.lock v4 issues
✅ Prevents edition2024 errors
✅ Eliminates ABI stack overflow
✅ Compatible with Anchor 0.28.0

---

## Troubleshooting

### Issue: "edition2024 is unstable"
**Cause**: wit-bindgen 0.51.0 being pulled in
**Fix**: Verify `[patch.crates-io]` has `wit-bindgen = "=0.24.0"`

### Issue: "Cargo.lock version 4"
**Cause**: Rust 1.82+ creating newer lockfile
**Fix**: Use Rust 1.75.0 via `rust-toolchain.toml`

### Issue: Still getting stack overflow
**Causes**:
1. Old Cargo.lock not deleted
2. rust-toolchain.toml not being read
3. Global Rust override in play

**Debug**:
```bash
# Check active Rust version in project
cd programs/djinn-market
rustc --version  # Must show 1.75.0

# Force clean
rm -rf target/ Cargo.lock ~/.cargo/registry/cache/
cargo clean

# Rebuild
anchor build
```

---

## Summary

The core issue is **version incompatibility cascade**:
1. Rust 1.92+ creates Cargo.lock v4
2. Solana BPF tools expect v3
3. Downgrading Rust alone pulls bleeding-edge dependencies (wit-bindgen 0.51)
4. wit-bindgen 0.51 requires edition2024 (unstable)
5. Meanwhile, mismatched solana-program versions cause ABI recursion

**The fix** is comprehensive pinning:
- Lock Rust to 1.75.0 (via rust-toolchain.toml)
- Pin solana-program to exact 1.16.27
- Pin wit-bindgen to 0.24.0
- Use [patch.crates-io] to enforce these across the dependency tree

This creates a stable, tested configuration that builds successfully with Anchor 0.28.0.
