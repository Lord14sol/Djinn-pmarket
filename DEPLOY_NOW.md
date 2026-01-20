# 🚀 DEPLOY AHORA - Comandos Exactos

## El Problema
- Contrato en Devnet: V4.0 (PDA only)
- IDL del frontend: V4.5 (SPL tokens)
- **ERROR: "RangeError: encoding overruns Buffer"**

## La Solución
Deploy el contrato V4.5 para que coincida con el IDL.

---

## Paso 1: Verificar Balance
```bash
solana balance --url devnet
```
**Necesitas:** Al menos 5 SOL en devnet

**Si no tienes suficiente:**
```bash
solana airdrop 5 --url devnet
```

---

## Paso 2: Deploy
```bash
cd /Users/benjaminfuentes/Djinn-pmarket/programs/djinn-market
anchor deploy --provider.cluster devnet
```

**Output esperado:**
```
Program Id: [NUEVO_PROGRAM_ID]
```

**⚠️ GUARDA ESE PROGRAM_ID!**

---

## Paso 3: Actualizar 3 Archivos

### Archivo 1: `lib/program-config.ts`
```typescript
export const PROGRAM_ID = new PublicKey('[NUEVO_PROGRAM_ID]');
```

### Archivo 2: `Anchor.toml`
```toml
[programs.devnet]
djinn_market = "[NUEVO_PROGRAM_ID]"
```

### Archivo 3: `programs/djinn-market/src/lib.rs` (línea 9)
```rust
declare_id!("[NUEVO_PROGRAM_ID]");
```

---

## Paso 4: Rebuild & Restart
```bash
# Rebuild (para sincronizar IDL)
anchor build

# Copy IDL (por si acaso)
cp target/idl/djinn_market.json ../../lib/idl/djinn_market.json

# Restart frontend
cd ../..
npm run dev
```

---

## Paso 5: Testear
1. Ve a http://localhost:3000/create
2. Crea un mercado nuevo
3. **Debe funcionar sin "encoding overruns Buffer"**
4. Compra 1 SOL de shares
5. **Debe aparecer en Phantom con foto/nombre**

---

## ⚠️ IMPORTANTE
**TODOS los mercados antiguos NO funcionarán con el nuevo contrato.**

Esto es normal - necesitas crear mercados NUEVOS después del deploy.

---

## Si Falla el Deploy

### Error: "Insufficient funds"
```bash
solana airdrop 5 --url devnet
```

### Error: "Program already deployed"
Es normal, el programa se actualiza a la nueva versión.

### Error: "Invalid signature"
```bash
solana-keygen recover
# Ingresa tu seed phrase
```

---

## Verificación Final
```bash
# Ver info del programa
solana program show [NUEVO_PROGRAM_ID] --url devnet

# Debe mostrar:
# Program Id: [NUEVO_PROGRAM_ID]
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# Data Length: ~XXXX bytes
```

---

**Status:** Listo para deployar ✅
**Tiempo Estimado:** 5 minutos
**Riesgo:** Bajo (backup automático por Solana)
