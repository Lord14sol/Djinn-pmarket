# 🚀 Deployment Checklist - V4.5 SPL Upgrade

**Date:** 2026-01-19
**Version:** V4.5 (SPL Token Integration)

---

## ✅ Pre-Deployment Verification

### 1. Code Changes Verified
- [x] `lib/core-amm.ts` - P_START fixed to `0.000000001` (1 nanoSOL)
- [x] `lib.rs` - Added `token::mint_to` in `buy_shares` (line 369-408)
- [x] `lib.rs` - Added `token::burn` in `sell_shares` (line 504-525)
- [x] `hooks/useDjinnProtocol.ts` - SPL token accounts added to buy/sell
- [x] `lib/idl/djinn_market.json` - Regenerated with new accounts

### 2. Build Successful
```bash
cd programs/djinn-market
anchor build
```
Expected: `Finished release [optimized] target(s)`

---

## 🔧 Deployment Steps

### Step 1: Deploy Contract
```bash
cd programs/djinn-market
anchor deploy --provider.cluster devnet
```

**Save the output:**
```
Program Id: [NEW_PROGRAM_ID]
```

### Step 2: Update Program ID in 3 Files

#### File 1: `lib/program-config.ts`
```typescript
export const PROGRAM_ID = new PublicKey('[NEW_PROGRAM_ID]');
```

#### File 2: `Anchor.toml`
```toml
[programs.devnet]
djinn_market = "[NEW_PROGRAM_ID]"
```

#### File 3: `programs/djinn-market/src/lib.rs`
```rust
declare_id!("[NEW_PROGRAM_ID]");
```

### Step 3: Rebuild & Copy IDL
```bash
anchor build
cp target/idl/djinn_market.json ../../lib/idl/djinn_market.json
```

### Step 4: Restart Frontend
```bash
npm run dev
```

---

## 🧪 Testing Protocol

### Test 1: Create New Market
1. Go to `/create`
2. Fill form:
   - Title: "Test Market V4.5"
   - Banner: Upload image
   - Resolution: 7 days from now
3. Click "Create Market"
4. **Expected**: Transaction succeeds, no "too many arguments" error

### Test 2: Buy Shares (First Time)
1. Navigate to new market
2. Buy 1 SOL worth of YES shares
3. Confirm transaction in wallet
4. **Expected**:
   - Transaction cost: ~1.002 SOL
   - Notification: "Bought ~4,050,000 YES shares" (NOT "0.00")
   - Phantom shows: `[YES] - Test Market V4.5`

### Test 3: Buy Shares (Second Time)
1. Buy another 0.5 SOL worth
2. **Expected**:
   - Transaction cost: ~0.50002 SOL (minimal network fee)
   - Balance updates in Phantom

### Test 4: Sell Shares
1. Click "Sell" tab
2. Use 100% button
3. Confirm transaction
4. **Expected**:
   - Shares burned from wallet
   - SOL returned to wallet (minus 1% exit fee)
   - Phantom balance updates

---

## 🔍 Troubleshooting

### Issue: "Too many arguments"
**Cause**: IDL not regenerated after contract changes
**Fix**:
```bash
anchor build
cp target/idl/djinn_market.json ../../lib/idl/djinn_market.json
```

### Issue: "Bought 0.00 shares"
**Cause**: P_START mismatch (frontend vs contract)
**Verify**: Check `lib/core-amm.ts` line 23 = `0.000000001`

### Issue: Tokens don't appear in Phantom
**Cause**: Old market (created before V4.5)
**Fix**: Create a NEW market after deploying V4.5

### Issue: "Account not found" error
**Cause**: ATAs not created
**Verify**: Frontend calls `createAssociatedTokenAccountIdempotentInstruction`

---

## 📊 Success Metrics

After deployment, verify:

- [ ] New markets create without errors
- [ ] Share notifications show correct amounts (millions, not 0)
- [ ] Tokens appear in Phantom with:
  - [ ] Correct name: `[YES] - Market Name`
  - [ ] Market image
  - [ ] Accurate balance
- [ ] Sell functionality burns tokens correctly
- [ ] First-time cost: ~0.002 SOL
- [ ] Subsequent costs: ~0.00002 SOL

---

## 🎉 Go-Live Checklist

Before announcing to users:

- [ ] Deploy to devnet
- [ ] Test all 4 scenarios above
- [ ] Create 2-3 test markets
- [ ] Execute 5+ buy/sell transactions
- [ ] Verify Solscan shows correct metadata
- [ ] Screenshot Phantom showing tokens
- [ ] Update documentation links
- [ ] Announce on Discord/Twitter

---

## 📝 Post-Deployment

### Update README.md
- [ ] New Program ID
- [ ] V4.5 features documented
- [ ] Cost structure explained

### Update User Docs
- [ ] Explain first-time ATA cost
- [ ] Show Phantom screenshots
- [ ] Link to Solscan for metadata verification

---

## 🆘 Rollback Plan (If Needed)

If critical bugs discovered:

1. Revert to V4.0 Program ID: `HkjMQFag41pUutseBpXSXUuEwSKuc2CByRJjyiwAvGjL`
2. Update `lib/program-config.ts`
3. Copy old IDL: `git checkout HEAD -- lib/idl/djinn_market.json`
4. Restart frontend

---

**Status**: Ready for deployment ✅
**Risk Level**: Low (backwards compatible, additive changes only)
**Estimated Time**: 15 minutes
