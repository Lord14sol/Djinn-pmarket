# 🚀 Instrucciones de Deploy - Djinn Markets V2

## ⚠️ Problema Actual

No se pudo compilar debido a:
- Cargo lockfile version 4 requiere Rust muy reciente (edge/nightly)
- Solana toolchain está generando lockfiles incompatibles
- El archivo lib.rs se está revirtiendo por el linter

## ✅ Solución: Deploy Manual

### Paso 1: Preparar el Entorno

```bash
# Actualizar Solana CLI a la última versión
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Reiniciar terminal y verificar
solana --version  # Debe ser v1.18+

# Actualizar Rust
rustup update stable
rustup default stable
rustc --version  # Debe ser v1.75+
```

### Paso 2: Configurar Keypair

Tu keypair ya está en: `~/.config/solana/deployer.json`
Pubkey: `G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma`
Balance Devnet: `5.195 SOL` ✅

```bash
# Configurar Solana CLI
solana config set --keypair ~/.config/solana/deployer.json
solana config set --url devnet
solana balance  # Verificar que tengas SOL
```

### Paso 3: Asegurar que lib.rs tenga el código correcto

El código nuevo está guardado pero podría revertirse. Antes de compilar, verifica:

```bash
cd /Users/benjaminfuentes/Desktop/Djinn-pmarket/programs/djinn-market/programs/djinn-market/src

# Verificar que tenga la nueva estructura
grep "MAX_OUTCOMES" lib.rs
grep "outcome_names" lib.rs
grep "initialize_outcome" lib.rs
```

**Si no aparecen esas líneas**, copia el código correcto desde `NUEVA_ARQUITECTURA.md` o restaura desde el backup.

### Paso 4: Build

```bash
cd /Users/benjaminfuentes/Desktop/Djinn-pmarket/programs/djinn-market

# Limpiar
rm -rf Cargo.lock target

# Build con Anchor
anchor build

# Si falla, intenta con cargo directamente
cd programs/djinn-market
cargo build-sbf
```

### Paso 5: Deploy

**Opción A: Deploy como upgrade del programa existente**
```bash
# El program ID actual es: 51TPDYh8oFCBCiCRFLvvtFpZvQd3Q4FyjLnDe9xxCsmv
solana program deploy \
  target/deploy/djinn_market.so \
  --program-id 51TPDYh8oFCBCiCRFLvvtFpZvQd3Q4FyjLnDe9xxCsmv \
  --upgrade-authority ~/.config/solana/deployer.json
```

**Opción B: Deploy como programa nuevo** (recomendado)
```bash
# Genera un nuevo keypair para el programa
solana-keygen new -o target/deploy/djinn_market-keypair.json

# Deploy
solana program deploy \
  target/deploy/djinn_market.so \
  --program-id target/deploy/djinn_market-keypair.json

# El comando te dará el nuevo PROGRAM_ID
# Por ejemplo: Program Id: ABC123...XYZ
```

### Paso 6: Actualizar Frontend

Después del deploy exitoso:

1. Copia el PROGRAM_ID que te devolvió el comando
2. Actualiza en `hooks/useDjinnProtocol.ts` línea 8:
   ```typescript
   const PROGRAM_ID = new PublicKey("TU_NUEVO_PROGRAM_ID_AQUI");
   ```
3. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Paso 7: Inicializar el Protocol

Antes de crear markets, necesitas inicializar el protocol state:

```typescript
// En la consola del navegador o crear un script
const { program } = useDjinnProtocol();

const [protocolStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("protocol")],
    program.programId
);

await program.methods
    .initializeProtocol()
    .accounts({
        protocolState: protocolStatePda,
        authority: wallet.publicKey,
        treasury: wallet.publicKey,  // O la wallet del treasury
        systemProgram: SystemProgram.programId,
    })
    .rpc();
```

## 🧪 Testear

1. Crear un Binary Market:
   - Ir a la UI
   - Click "Create Market"
   - Seleccionar "Binary"
   - Outcomes: "Yes", "No"
   - Crear

2. Verificar en Solscan Devnet:
   - Market PDA debe existir
   - 2 Token Mints deben existir (YES y NO)
   - Cada uno con CA diferente ✅

3. Crear un Multiple Market:
   - Seleccionar "Multiple"
   - Outcomes: "Brasil", "Argentina", "Francia"
   - Crear
   - Verificar 3 Token Mints con CAs diferentes ✅

## 📝 Notas Importantes

- **NUNCA** compartas tu keypair privado
- Después de usar, elimina `~/.config/solana/deployer.json`:
  ```bash
  rm ~/.config/solana/deployer.json
  ```
- El programa viejo (51TPDYh...) seguirá funcionando con la lógica antigua
- El programa nuevo tendrá la arquitectura de múltiples outcomes
- Puedes tener ambos corriendo simultáneamente

## 🆘 Troubleshooting

**Error: "Insufficient funds"**
```bash
# Pedir más SOL en devnet
solana airdrop 2
```

**Error: "lockfile version 4"**
```bash
# Usar Rust nightly
rustup default nightly
cargo clean
anchor build
```

**Error: "Program upgrade failed"**
- Intenta la Opción B (deploy como programa nuevo)
- Asegúrate de ser el upgrade authority

**lib.rs se revierte al código viejo**
- Desactiva linters/formatters
- Copia el código directamente antes de compilar
- Usa `cat > lib.rs` para sobrescribir
