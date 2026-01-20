# ¿Por qué mis shares NO aparecen en Phantom? 🤔

## La Situación Actual

**Tu expectativa (100% válida):**
> "Si compro shares, deberían aparecer en mi Phantom wallet con la foto y nombre del mercado, aunque valgan poco"

**La realidad del contrato actual:**
> Los shares NO aparecen en Phantom porque el contrato usa un sistema de "Ledger Interno" (PDAs) en lugar de tokens SPL reales

---

## 🔍 Evidencia Técnica

### 1. Lo que SÍ crea el contrato:

✅ **YES Mint** (dirección del token YES)
✅ **NO Mint** (dirección del token NO)
✅ **Metaplex Metadata** (nombre "[YES] - Mi Mercado" + imagen)

### 2. Lo que NO hace el contrato:

❌ **NO mintea tokens a tu wallet**
❌ **NO crea cuentas de token (ATAs) con balance**

### 3. Lo que SÍ hace cuando compras:

```rust
// lib.rs línea 367
position.shares = position.shares + shares;  // ← Solo actualiza un número en un PDA
```

**NO hay ninguna llamada a `token::mint_to()`**

---

## 📊 Comparación Visual

### Lo que Phantom necesita para mostrar un token:

```
1. ✅ Mint existe (YES/NO)
2. ✅ Metadata existe (nombre + imagen)
3. ❌ Tu wallet tiene tokens (balance > 0)  ← ESTO FALTA
```

### Lo que tu contrato ACTUAL hace:

```
Compras 1 SOL de shares
    ↓
Contrato calcula: "4.05M shares"
    ↓
Guarda en PDA: position.shares = 4,050,000
    ↓
Tu balance de TOKENS SPL = 0  ← Por eso Phantom no muestra nada
```

---

## 🤷 ¿Por qué se diseñó así?

**Ventajas del sistema PDA (actual):**
- ✅ Más barato en fees (no hay mint/burn constante)
- ✅ Mejor para curvas complejas (matemática precisa con u128)
- ✅ No necesita ATAs por usuario

**Desventaja:**
- ❌ Los shares NO aparecen en wallets como Phantom
- ❌ Solo se ven en tu App UI

---

## ✅ Solución: Agregar Minting de Tokens

Si quieres que los shares aparezcan en Phantom, necesitas:

### 1. Modificar el contrato `lib.rs`:

**Agregar cuentas de token a BuyShares:**
```rust
pub struct BuyShares<'info> {
    // ... cuentas existentes ...

    // NUEVAS:
    #[account(mut)]
    pub yes_mint: Account<'info, Mint>,

    #[account(mut)]
    pub no_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
```

**Agregar lógica de minting en `buy_shares()`:**
```rust
pub fn buy_shares(...) -> Result<()> {
    // ... cálculo de shares existente ...

    // NUEVO: Mintear tokens SPL al usuario
    let mint_key = if outcome == 0 {
        ctx.accounts.yes_mint.to_account_info()
    } else {
        ctx.accounts.no_mint.to_account_info()
    };

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: mint_key,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        shares as u64,
    )?;

    Ok(())
}
```

### 2. Modificar el frontend `useDjinnProtocol.ts`:

**Agregar cuentas al llamar `buyShares()`:**
```typescript
const { getAssociatedTokenAddress } = await import('@solana/spl-token');
const mint = side === 'yes' ? yesMint : noMint;
const userATA = await getAssociatedTokenAddress(mint, wallet.publicKey);

const txHash = await program.methods
    .buyShares(outcomeIndex, amountLamports, minSharesBN, maxPriceImpactBps)
    .accounts({
        // ... cuentas existentes ...

        // NUEVAS:
        yesMint: yesMint,
        noMint: noMint,
        userTokenAccount: userATA,
        tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
```

### 3. Re-deployar el contrato:

```bash
cd programs/djinn-market
anchor build
anchor deploy --provider.cluster devnet
```

---

## 🎯 Resumen

**Situación actual:**
- ✅ Fixes 1 y 2 están hechos (IDL + Math)
- ⚠️ Los shares NO aparecerán en Phantom (diseño PDA)
- ✅ Los shares SÍ aparecen en tu App UI

**Si quieres que aparezcan en Phantom:**
- Necesitas modificar el contrato para agregar `token::mint_to()`
- Esto requiere re-deploy
- Es una decisión de arquitectura (PDA vs SPL tokens)

---

## 🤔 ¿Qué prefieres?

**Opción A: Mantener diseño PDA (actual)**
- Pros: Más barato, más eficiente
- Cons: No aparece en Phantom
- Acción: Ninguna, ya está listo para testear

**Opción B: Cambiar a SPL Tokens**
- Pros: Aparece en Phantom con foto y nombre
- Cons: Más caro en fees, requiere re-deploy
- Acción: Modificar contrato (te puedo ayudar)

¿Cuál eliges?
