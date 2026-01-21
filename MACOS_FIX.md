# macOS Apple Silicon - Dependency Deadlock Solution

## The Problem: wit-bindgen 0.51.0 Edition2024 Trap

### Symptoms
When running `cargo update` or `anchor build` on macOS (especially Apple Silicon):
```
error: failed to download `wit-bindgen v0.51.0`
Caused by: feature `edition2024` is required
```

This happens even with:
- ✅ Rust 1.75.0 locked via `rust-toolchain.toml`
- ✅ `solana-program = "=1.16.27"` pinned
- ✅ All dependencies seemingly correct

### Root Cause
**Platform-specific dependency resolution**: On macOS, certain transitive dependencies in the mpl-token-metadata → solana-program chain attempt to pull `wit-bindgen 0.51.0`, which requires:
- `edition = "2024"` (unstable, nightly-only)
- Rust 1.85+ (not released yet)

This creates an **impossible deadlock**:
1. Can't use Nightly Rust (breaks Solana BPF tools)
2. Can't use Stable Rust (won't parse wit-bindgen 0.51.0's Cargo.toml)

---

## The Solution: Git-Based Patch Override

### Why This Works
`[patch.crates-io]` **CAN** override dependencies when pointing to **different sources**:
- ❌ crates.io → crates.io (same source, fails)
- ✅ crates.io → git (different source, works!)

By patching wit-bindgen to its git repository at tag v0.24.0, we force Cargo to use that version across the entire dependency tree, bypassing the edition2024 requirement.

---

## Implementation

### File: `programs/djinn-market/Cargo.toml`

```toml
[patch.crates-io]
# Force wit-bindgen to 0.24.0 from git (avoids edition2024 requirement)
wit-bindgen = { git = "https://github.com/bytecodealliance/wit-bindgen", tag = "v0.24.0" }
wit-bindgen-rust = { git = "https://github.com/bytecodealliance/wit-bindgen", tag = "v0.24.0" }
wit-bindgen-rust-macro = { git = "https://github.com/bytecodealliance/wit-bindgen", tag = "v0.24.0" }
```

### File: `programs/djinn-market/programs/djinn-market/Cargo.toml`

```toml
[dependencies]
anchor-lang = { version = "0.28.0", features = ["init-if-needed"] }
anchor-spl = { version = "0.28.0", features = ["metadata"] }
mpl-token-metadata = "1.13.1"
solana-program = "=1.16.27"  # Exact version critical
borsh = "=0.10.3"
borsh-derive = "=0.10.3"
```

### File: `programs/djinn-market/rust-toolchain.toml`

```toml
[toolchain]
channel = "1.75.0"
components = ["rustfmt", "clippy"]
```

---

## Build Steps for macOS

### 1. Clean Everything
```bash
cd /path/to/Djinn-pmarket/programs/djinn-market

# Remove ALL cached artifacts
rm -rf target/
rm -rf ~/.cargo/registry/index/*
rm -rf ~/.cargo/git/checkouts/*
rm Cargo.lock

# Force cargo clean
cargo clean
```

### 2. Verify Rust Version
```bash
rustc --version
# Should show: rustc 1.75.0

# If not, force it:
rustup override set 1.75.0
```

### 3. Update Dependencies (With Git Patches)
```bash
# This should now work without edition2024 error
cargo update

# Verify no wit-bindgen 0.51.0
cargo tree | grep wit-bindgen
# Should show v0.24.0 from git
```

### 4. Build
```bash
# Option 1: Full Anchor build
anchor build

# Option 2: Direct cargo (faster, no IDL)
cd programs/djinn-market
cargo build-sbf
```

---

## Verification Checklist

Run these commands to verify the fix:

```bash
# 1. Check Rust version (must be 1.75.0)
rustc --version

# 2. Check dependency resolution
cargo tree | grep wit-bindgen
# Expected: wit-bindgen v0.24.0 (https://github.com/bytecodealliance/...)

# 3. Check no edition2024 errors
cargo check 2>&1 | grep -i "edition2024"
# Expected: (no output)

# 4. Check solana-program version
cargo tree | grep "solana-program "
# Expected: solana-program v1.16.27
```

---

## Why Previous Attempts Failed

### ❌ Direct Version Pinning
```toml
[patch.crates-io]
wit-bindgen = { version = "=0.24.0" }
```
**Failed because**: Same source (crates.io), Cargo ignores patch

### ❌ Lockfile Manipulation
```bash
# Manually editing Cargo.lock
```
**Failed because**: Next `cargo update` regenerates from registry

### ❌ Downgrading solana-program to 1.14.x
```toml
solana-program = "=1.14.17"
```
**Failed because**:
- Anchor 0.28.0 expects 1.16.x features
- Stack overflow still occurs with 1.14.x on newer Rust

---

## Platform-Specific Notes

### macOS Apple Silicon (M1/M2/M3)
- **Extra dependency pulls**: Apple Silicon sometimes triggers additional platform-specific dependencies
- **Registry caching**: More aggressive - needs `rm -rf ~/.cargo/registry/index/*`
- **Git checkout caching**: Clear `~/.cargo/git/checkouts/*` if issues persist

### Intel Mac
- Usually follows Linux resolution paths
- Git patches still recommended for consistency

### Linux
- May not need git patches (direct version pinning often works)
- If needed, same git patch approach applies

---

## Troubleshooting

### Issue: "Patch was not used in the crate graph"
**Cause**: Git clone not completing or wrong tag
```bash
# Force re-clone
rm -rf ~/.cargo/git/checkouts/wit-bindgen*
cargo clean
cargo update
```

### Issue: Still getting edition2024 error
**Cause**: Old Cargo.lock still present
```bash
rm Cargo.lock
rm -rf target/
cargo update
```

### Issue: "failed to fetch" git errors
**Cause**: Network or git authentication
```bash
# Try HTTPS explicitly
[patch.crates-io]
wit-bindgen = { git = "https://github.com/bytecodealliance/wit-bindgen.git", tag = "v0.24.0" }

# Or use rev instead of tag
wit-bindgen = { git = "https://github.com/bytecodealliance/wit-bindgen", rev = "cb871cfa1ee460b51eb1d144b175b9adb9c1c244" }
```

### Issue: Stack overflow still occurs
**Verify**:
1. ✅ Rust 1.75.0 active: `rustc --version`
2. ✅ solana-program 1.16.27: `cargo tree | grep solana-program`
3. ✅ No large stack allocations in your code

If all verified and still failing:
```bash
# Nuclear option: Disable IDL generation
cargo build-sbf --features no-idl
```

---

## Why This Solution Works

### The Dependency Chain
```
your-program
  └── anchor-lang 0.28.0
      └── anchor-spl 0.28.0
          └── mpl-token-metadata 1.13.1
              └── solana-program 1.16.27
                  └── (transitive) → wit-bindgen 0.51.0 ❌
```

### With Git Patch Applied
```
your-program
  └── anchor-lang 0.28.0
      └── anchor-spl 0.28.0
          └── mpl-token-metadata 1.13.1
              └── solana-program 1.16.27
                  └── (PATCHED) → wit-bindgen 0.24.0 ✅ (from git)
```

The patch intercepts **before** Cargo's version resolution, forcing the entire tree to use 0.24.0.

---

## Success Criteria

After applying this fix, you should see:

```bash
$ cargo build --release
   Compiling wit-bindgen v0.24.0 (https://github.com/bytecodealliance/wit-bindgen?tag=v0.24.0#...)
   Compiling solana-program v1.16.27
   Compiling anchor-lang v0.28.0
   Compiling djinn-market v0.1.0
    Finished release [optimized] target(s) in 2m 15s
```

✅ **No edition2024 errors**
✅ **No stack overflow**
✅ **Builds successfully on macOS**

---

## Additional Notes

### Cargo Resolver v2
The workspace uses `resolver = "2"`, which is correct for Anchor 0.28.0. Don't change this.

### Anchor Version
**Do not upgrade Anchor** beyond 0.28.0 without verifying compatibility with your entire dependency stack.

### Solana CLI
For deployment, ensure Solana CLI matches Anchor.toml:
```bash
solana --version
# Should be: solana-cli 1.18.20 (or as specified in Anchor.toml)
```

---

## Summary

**The Deadlock**: wit-bindgen 0.51.0 requires edition2024 (unstable)
**The Solution**: Git-based patch forces wit-bindgen 0.24.0
**The Result**: Build succeeds on macOS with Rust 1.75.0

This approach breaks the dependency deadlock by overriding the problematic dependency before Cargo's resolver encounters the edition2024 manifest.

**Build command**:
```bash
cd programs/djinn-market
rm -rf target/ Cargo.lock
cargo update
anchor build
```

Should now complete successfully! 🎉
