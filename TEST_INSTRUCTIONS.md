# 🧪 INSTRUCCIONES DE TESTING - Djinn Market

## 🚀 TESTING INMEDIATO

### Paso 1: Abrir la App
```bash
cd /Users/benjaminfuentes/Desktop/Djinn-pmarket
npm run dev
```

### Paso 2: Crear Market Nuevo de Prueba

1. Conecta tu wallet
2. Crea un market llamado **"Test Binary"**
   - Tipo: Binary (YES/NO)
   - Fecha de fin: Mañana
3. **IMPORTANTE:** Después de crear, verifica en Supabase:
   ```sql
   SELECT slug, total_yes_pool, total_no_pool, created_at
   FROM markets
   WHERE slug = 'test-binary';
   ```
   - Si `total_yes_pool` y `total_no_pool` son NULL o 0, necesitas fix de inicialización

---

## 🔍 TEST CASE #1: Explosión de Precio ARREGLADO

### Problema Original:
```
Compra 1 SOL → Precio salta a 100% ❌
```

### Prueba:
```bash
1. Ir al market "Test Binary"
2. Comprar 1 SOL de YES
3. Observar precio en UI
```

### ✅ Resultado Esperado:
```
Precio antes: 50%
Precio después: ~60-65%
Peru mcap: ~$200 USD
Chile mcap: ~$100 USD
```

### ❌ Si falla:
- Revisa console.log en navegador
- Busca: "📊 Current Pools:"
- Si yesPool = 0, el problema es inicialización

---

## 🔍 TEST CASE #2: Gráfico Sincronizado

### Problema Original:
```
Gráfico muestra puntos ANTES de la creación del market ❌
```

### Prueba:
```bash
1. Crear market a las 3:00 PM
2. Verificar eje X del gráfico
3. El primer punto debe ser >= 3:00 PM
```

### ✅ Resultado Esperado:
```
Primer punto: 3:00 PM (hora de creación)
NO hay puntos en 2:55 PM, 2:50 PM, etc.
```

### ❌ Si falla:
- El problema está en `generateChartData()`
- Verifica que recibe `marketCreatedAt` correctamente

---

## 🔍 TEST CASE #3: Market Cap Separado

### Problema Original:
```
Peru mcap: $379
Chile mcap: $0
(Debería ser Peru: $200, Chile: $400)
```

### Prueba:
```bash
1. Market "Peru vs Chile"
2. Comprar 1 SOL de Peru
3. Comprar 2 SOL de Chile
4. Verificar en DB:
   SELECT slug, total_yes_pool as peru_pool, total_no_pool as chile_pool
   FROM markets
   WHERE slug LIKE '%peru%';
```

### ✅ Resultado Esperado:
```
peru_pool: ~$200
chile_pool: ~$400
```

### ❌ Si falla:
- Problema en `handlePlaceBet` línea ~472
- Los pools NO se están persistiendo correctamente

---

## 🔍 TEST CASE #4: Shares NO Se Mezclan

### Problema Original:
```
Compro 1 SOL Peru + 2 SOL Chile
Al vender Chile: "No shares"
Al vender Peru: Muestra 3 SOL (mezclados) ❌
```

### Prueba:
```bash
1. Comprar 1 SOL de Peru
2. Comprar 2 SOL de Chile
3. Verificar en DB:
   SELECT market_slug, side, amount, shares, claimed
   FROM bets
   WHERE wallet_address = 'TU_WALLET'
   ORDER BY created_at DESC;
```

### ✅ Resultado Esperado:
```sql
Row 1: market_slug='peru-vs-chile', side='NO', amount=400, claimed=false
Row 2: market_slug='peru-vs-chile', side='YES', amount=200, claimed=false
```

Debe haber **2 ROWS SEPARADOS**, no 1 row con amount=600.

### ❌ Si falla:
- Problema en `lib/supabase-db.ts:499-526`
- Verifica que NO esté usando UPDATE (debe ser INSERT)

---

## 🔍 TEST CASE #5: Venta Independiente

### Problema Original:
```
Tengo Peru + Chile
Vendo Chile → "No shares found"
Vendo Peru → Vende TODO (mezclado) ❌
```

### Prueba:
```bash
1. Tener 1 SOL Peru + 2 SOL Chile
2. Click en "Sell Shares" (debería preguntar cuál lado)
3. Vender solo Chile
4. Verificar:
   - Chile bets marcados como claimed=true
   - Peru bets siguen claimed=false
```

### ✅ Resultado Esperado:
```sql
-- Después de vender Chile:
Row 1 (Chile): claimed=true
Row 2 (Peru): claimed=false

-- Peru mcap NO cambia
-- Chile mcap baja
```

### ❌ Si falla:
- Problema en botón de venta (línea ~889-956)
- Verifica que use `myBetsThisSide` correctamente

---

## 🔧 DEBUG TOOLS

### 1. Ver Pools en Console
Abre DevTools → Console, busca:
```
📊 Current Pools: { yesPool: 200, noPool: 100, probability: 66.67 }
```

### 2. Ver Posiciones de Usuario
```
📊 User positions: { yesAmount: 200, noAmount: 400, yesBets: 1, noBets: 1 }
```

### 3. Queries de Verificación en Supabase

**Ver Market:**
```sql
SELECT slug, total_yes_pool, total_no_pool, created_at
FROM markets
WHERE slug = 'test-binary';
```

**Ver Bets de Usuario:**
```sql
SELECT market_slug, side, amount, shares, claimed, created_at
FROM bets
WHERE wallet_address = 'TU_WALLET'
ORDER BY created_at DESC
LIMIT 10;
```

**Ver Activity:**
```sql
SELECT username, action, amount, shares, market_slug, created_at
FROM activity
WHERE market_slug = 'test-binary'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 PROBLEMAS COMUNES

### Problema: "Precio sigue explotando a 100%"
**Causa:** Pools NO inicializados en DB
**Fix:**
```typescript
// En CreateMarket o al cargar market:
if (!market.total_yes_pool || market.total_yes_pool === 0) {
    await supabaseDb.createMarket({
        ...market,
        total_yes_pool: 100, // INITIAL_LIQUIDITY_PER_SIDE
        total_no_pool: 100
    });
}
```

### Problema: "Gráfico muestra horas pasadas"
**Causa:** `generateChartData()` no recibe `marketCreatedAt`
**Fix:** Verifica que pases `market.created_at` en línea ~368

### Problema: "Shares mezclados"
**Causa:** `createBet()` usa UPDATE en vez de INSERT
**Fix:** Verifica `lib/supabase-db.ts:507` - debe ser `INSERT`

### Problema: "Venta NO funciona"
**Causa:** Botón vende lado incorrecto
**Fix:** Verifica que `inverseSide` se calcule correctamente (línea ~918)

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de cada test, marca:

- [ ] Precio NO explota a 100% con primera compra
- [ ] Gráfico empieza desde hora de creación
- [ ] Peru mcap ≠ Chile mcap (separados)
- [ ] Bets de YES y NO son ROWS separados en DB
- [ ] Vender YES NO afecta shares de NO
- [ ] Activity muestra shares negativos en venta
- [ ] Pools persisten después de refrescar página

---

## 📞 SI TODO FALLA

1. **Revisar Console del Navegador:**
   - Busca errores rojos
   - Busca "📊 Current Pools:"
   - Verifica que pools NO sean 0

2. **Revisar Supabase:**
   - `total_yes_pool` y `total_no_pool` deben tener valores
   - Tabla `bets` debe tener múltiples rows por usuario

3. **Reiniciar desde Cero:**
   ```bash
   # Eliminar markets de prueba
   DELETE FROM markets WHERE slug LIKE '%test%';
   DELETE FROM bets WHERE market_slug LIKE '%test%';
   DELETE FROM activity WHERE market_slug LIKE '%test%';

   # Crear nuevo market
   # Probar nuevamente
   ```

---

**Última Actualización:** 2026-01-20
**Version:** 2.0
