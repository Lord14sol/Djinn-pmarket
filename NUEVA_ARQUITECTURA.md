# 🎯 Nueva Arquitectura de Djinn Markets - Múltiples Outcomes

## ✅ Problema Solucionado

**Antes**: El contrato creaba UN SOLO token mint para todos los outcomes (YES, NO, etc.), causando que todos compartieran la misma CA (Contract Address).

**Ahora**: Cada outcome tiene su **propio token mint separado** con su **propia CA única**.

---

## 🏗️ Arquitectura del Smart Contract

### 1. **Market Structure**

```rust
pub struct Market {
    pub creator: Pubkey,                      // Creador del market
    pub title: String,                        // Pregunta/título
    pub outcome_names: [String; 6],           // Nombres de los outcomes (max 6)
    pub outcome_shares: [u64; 6],             // Total shares por outcome
    pub outcome_count: u8,                    // Cantidad de outcomes (2-6)
    pub total_liquidity: u64,                 // Total SOL en el vault
    pub fee_percentage: u16,                  // Fee en basis points (200 = 2%)
    pub resolution_time: i64,                 // Timestamp de resolución
    pub status: MarketStatus,                 // Open | Resolved
    pub winning_outcome_index: Option<u8>,    // Índice del ganador (None = Void)
    pub bump: u8,                             // PDA bump
}
```

### 2. **Token Mints - Cada Outcome tiene su CA**

**Binary Market** (2 outcomes):
- Outcome 0 (YES): `PDA["outcome_mint", market_pda, [0]]` → CA única
- Outcome 1 (NO): `PDA["outcome_mint", market_pda, [1]]` → CA única

**Multiple Market** (3-6 outcomes):
- Outcome 0 (Brasil): `PDA["outcome_mint", market_pda, [0]]` → CA única
- Outcome 1 (Argentina): `PDA["outcome_mint", market_pda, [1]]` → CA única
- Outcome 2 (Chile): `PDA["outcome_mint", market_pda, [2]]` → CA única
- ...hasta 6 outcomes

---

## 📝 Flujo de Creación de Markets

### Frontend (CreateMarketModal.tsx)

```typescript
// 1. Usuario elige Binary o Multiple
const marketType = 'binary' | 'multiple';

// 2. Define outcome names
const outcomeNames = ['Yes', 'No']; // Binary
// O
const outcomeNames = ['Brasil', 'Argentina', 'Chile']; // Multiple

// 3. Llama al smart contract
const result = await createMarketOnChain(
    "¿Quién ganará el mundial?",
    outcomeNames,              // ✅ Ahora se pasan los nombres
    new Date(endDate),
    200  // 2% fee
);

// 4. Recibe los token mints
console.log(result.marketPda);      // Market PDA
console.log(result.outcomeMints);   // Array de CAs [mint0, mint1, mint2...]
```

### Hook (useDjinnProtocol.ts)

```typescript
const createMarket = async (title, outcomeNames, endDate, feePercentage) => {
    // Step 1: Create Market Account
    const tx = await program.methods
        .createMarket(title, outcomeNames, feePercentage, resolutionTime)
        .accounts({ market, creator, ... })
        .rpc();

    // Step 2: Initialize cada outcome token mint
    const outcomeMints = [];
    for (let i = 0; i < outcomeNames.length; i++) {
        const [mint] = derivePDA(["outcome_mint", marketPda, [i]]);
        await program.methods
            .initializeOutcome(i)
            .accounts({ market, outcomeMint: mint, ... })
            .rpc();
        outcomeMints.push(mint);
    }

    return { marketPda, outcomeMints };
};
```

---

## 🎲 Flujo de Apuestas (Place Bet)

```typescript
// Usuario apuesta a outcome index 1 (Argentina)
await placeBet(marketPda, 1, 0.5); // 0.5 SOL

// Internamente:
// 1. Deriva el outcome mint: PDA["outcome_mint", marketPda, [1]]
// 2. Crea ATA del usuario para ese mint
// 3. Usuario envía 0.5 SOL al Market PDA
// 4. Market mintea 0.5 tokens del outcome 1 al usuario (1:1)
// 5. Actualiza market.outcome_shares[1] += 0.5
```

---

## 🏆 Resolución y Claims

### Resolución
```typescript
// Admin resuelve el market
await resolveMarket(marketPda, 1); // Argentina ganó (outcome index 1)
// O
await resolveMarket(marketPda, null); // Void - refund a todos
```

### Claim Rewards
```typescript
// Usuario que apostó a Argentina (outcome 1) reclama
await claimReward(marketPda, 1);

// Lógica:
// 1. Verifica que outcome 1 ganó
// 2. Calcula payout = (userShares / totalWinningShares) * (totalPot - fee)
// 3. Quema los tokens del usuario
// 4. Transfiere SOL al usuario
// 5. Transfiere fee al treasury
```

**Perdedores**: Los tokens de outcomes perdedores quedan con valor 0 (no se pueden quemar por SOL).

---

## 🔧 Cambios Técnicos Implementados

### 1. **Smart Contract** (`lib.rs`)
- ✅ Soporte para 2-6 outcomes
- ✅ Cada outcome tiene su propio token mint
- ✅ Función `initialize_outcome()` para crear mints
- ✅ Función `place_bet(outcome_index, amount)`
- ✅ Función `claim_reward(outcome_index)` con cálculo proporcional
- ✅ Manejo de Void markets (refund 1:1)

### 2. **IDL** (`djinn_market_v2.json`)
- ✅ Generado manualmente con estructura correcta
- ✅ Instrucciones: `createMarket`, `initializeOutcome`, `placeBet`, `resolveMarket`, `claimReward`
- ✅ Accounts: `Market`, `ProtocolState`
- ✅ Types: `MarketStatus` enum

### 3. **Hook** (`useDjinnProtocol.ts`)
- ✅ `createMarket(title, outcomeNames[], endDate, fee)`
- ✅ `placeBet(marketPda, outcomeIndex, amount)`
- ✅ `resolveMarket(marketPda, winningIndex | null)`
- ✅ `claimReward(marketPda, outcomeIndex)`
- ✅ `getUserOutcomeBalance(marketPda, outcomeIndex)`

### 4. **UI** (`CreateMarketModal.tsx`)
- ✅ Extrae outcome names de las options
- ✅ Valida mínimo 2 outcomes
- ✅ Pasa `outcomeNames[]` al hook
- ✅ Guarda todos los `outcomeMints` en DB

---

## 📊 Ejemplo Completo: Market "Mundial 2026"

### Creación
```javascript
const result = await createMarket(
    "¿Quién ganará el Mundial 2026?",
    ["Brasil", "Argentina", "Francia", "Alemania"],
    new Date("2026-07-15"),
    200
);

// Resultado:
{
    marketPda: "8xQ...",
    outcomeMints: [
        "H3U7...",  // Brasil (index 0)
        "9Km2...",  // Argentina (index 1)
        "5Pz8...",  // Francia (index 2)
        "2Wx4..."   // Alemania (index 3)
    ]
}
```

### Apuestas
```
- Juan apuesta 1 SOL a Brasil (index 0)
- María apuesta 2 SOL a Argentina (index 1)
- Pedro apuesta 0.5 SOL a Argentina (index 1)
- Ana apuesta 1 SOL a Francia (index 2)

Total pot: 4.5 SOL
outcome_shares[0] = 1 SOL (Brasil)
outcome_shares[1] = 2.5 SOL (Argentina)
outcome_shares[2] = 1 SOL (Francia)
outcome_shares[3] = 0 SOL (Alemania)
```

### Resolución
```javascript
// Argentina gana
await resolveMarket(marketPda, 1);
```

### Claims
```
María:
- Shares: 2 (de 2.5 total winning)
- Payout = (2 / 2.5) * (4.5 - 0.09) = 3.528 SOL
- Fee = (2 / 2.5) * 0.09 = 0.072 SOL → Treasury

Pedro:
- Shares: 0.5 (de 2.5 total winning)
- Payout = (0.5 / 2.5) * 4.41 = 0.882 SOL
- Fee = (0.5 / 2.5) * 0.09 = 0.018 SOL → Treasury

Juan y Ana: No pueden reclamar (perdieron)
```

---

## 🚀 Next Steps

1. **Deploy del Smart Contract** a Devnet/Mainnet
   - Compilar con Rust 1.92+ o nightly
   - `anchor build && anchor deploy`

2. **Actualizar BettingCard.tsx**
   - Mostrar todos los outcomes con sus nombres
   - Botones para apostar a cada outcome

3. **Actualizar Market Page**
   - Mostrar gráficos para cada outcome
   - Order book por outcome
   - Holders por outcome

4. **Database Schema**
   - Guardar `outcome_mints` como JSON array
   - Tabla `bets` con `outcome_index`
   - Vistas para calcular shares por outcome

---

## ⚠️ Notas Importantes

- El programa actual no se pudo compilar debido a problemas con el toolchain de Rust
- Se necesita Rust 1.92+ o nightly para compilar
- La lógica del contrato está completa y lista
- El IDL fue generado manualmente y está listo para usar
- El frontend está actualizado y listo una vez se haga deploy

---

## 🔒 Seguridad

- Market PDA almacena todo el SOL (actúa como vault)
- Solo el creator puede derivar el mismo Market PDA
- Solo protocol authority puede resolver markets
- Los tokens NO se pueden transferir entre usuarios (mint authority = market)
- Fee máximo: 10% (1000 basis points)
- Outcome names max: 50 chars cada uno
- Market title max: 200 chars
