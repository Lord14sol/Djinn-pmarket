# 🔮 Djinn - Solana Prediction Market

**Djinn** es un prediction market descentralizado en Solana donde los usuarios pueden apostar sobre el resultado de eventos futuros.

> **Djinn** (جن) - En la mitología árabe, un djinn es un ser sobrenatural con poderes para ver el futuro. Nuestro prediction market te da ese poder: predice el futuro y gana.

---

## 🎯 ¿Qué es Djinn?

Djinn es un mercado de predicciones on-chain donde puedes:
- ✅ **Crear mercados** sobre cualquier evento futuro
- 💰 **Apostar con SOL** en el resultado (YES o NO)
- 📊 **Ver precios en tiempo real** basados en la demanda
- 🏆 **Ganar dinero** si predices correctamente
- 💬 **Comentar y discutir** con otros traders

---

## 💎 Características Principales

### Frontend (100% Completo)
- ✅ Diseño moderno premium con gradientes y animaciones
- ✅ Wallet integration (Phantom, Solflare, etc.)
- ✅ Gráficos de precio dinámicos con efectos visuales
- ✅ Sistema de comentarios con likes en tiempo real
- ✅ Perfiles de usuario con active bets
- ✅ Feed global de actividad
- ✅ Categorías de mercados (Crypto, Sports, Politics, etc.)
- ✅ Creación de mercados custom

### Smart Contract (Anchor/Solana)
- ✅ Create market con fee de 0.03 SOL
- ✅ Trading YES/NO con fee de 0.1%
- ✅ Sistema de resolución con fee de 2%
- ✅ Shares como SPL tokens
- ✅ CPMM pricing algorithm
- ✅ Redención de ganancias

### Backend (Supabase)
- ✅ Base de datos PostgreSQL
- ✅ Real-time subscriptions
- ✅ Almacenamiento de:
  - Perfiles de usuario
  - Comentarios y likes
  - Actividad de trading
  - Market data

---

## 💰 Modelo de Revenue (Fees)

### 1. Market Creation Fee
**0.03 SOL** (~$3 USD) por crear un mercado
- Va 100% al treasury del protocolo

### 2. Trading Fee
**0.1%** de cada trade
- **Si TÚ creaste el market:** 100% para ti
- **Si otro usuario creó:** 50% para creador, 50% para protocolo

### 3. Resolution Fee
**2%** del pool total
- Va 100% al protocolo cuando se resuelve el mercado

**Ejemplo de revenue:**
Un mercado con $50,000 de volumen genera:
- Creation: $3
- Trading: $50
- Resolution: $1,000
- **Total: ~$1,053**

---

## 🏗️ Arquitectura Técnica

### Stack
```
Frontend:  Next.js 16 + TypeScript + TailwindCSS
Wallet:    Solana Web3.js + Wallet Adapter
Charts:    Recharts
Database:  Supabase (PostgreSQL + Realtime)
Smart Contract: Anchor (Rust)
Blockchain: Solana
```

### Estructura del Proyecto
```
Djinn-pmarket/
├── app/                      # Next.js pages
│   ├── page.tsx             # Homepage con markets
│   ├── market/[slug]/       # Página individual de market
│   ├── profile/[username]/  # Perfiles de usuario
│   └── leaderboard/         # Ranking de traders
├── components/
│   ├── market/              # Componentes de trading
│   │   ├── MarketChart.tsx  # Gráfico animado
│   │   ├── CommentsSection.tsx
│   │   └── OrderBook.tsx
│   ├── GlobalActivityFeed.tsx
│   └── Navbar.tsx
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   └── supabase-db.ts       # Funciones de DB
├── programs/
│   └── djinn-market/        # Smart contract Anchor
│       └── src/lib.rs       # Programa Solana
└── supabase-schema.sql      # Schema de base de datos
```

---

## 🚀 Cómo Funciona

### 1. Usuario crea un mercado
```typescript
Pregunta: "Will Bitcoin hit $150k in 2026?"
Fee: 0.03 SOL
Resultado: Mercado creado, YES/NO tokens minted
```

### 2. Usuarios apuestan
```typescript
Alice apuesta 10 SOL en YES
- Fee: 0.01 SOL (0.1%)
- Recibe: ~10 YES tokens
- Precio YES sube a 65%
```

### 3. Mercado se resuelve
```typescript
Fecha límite alcanzada
Oracle decide: YES ganó
Fee: 2% del pool total
Ganadores pueden hacer redeem
```

### 4. Alice reclama ganancias
```typescript
Alice tenía 10 YES tokens
Pool total: 100 SOL
YES tokens totales: 50
Payout de Alice: (10/50) * 100 = 20 SOL
Profit: 20 - 10 = 10 SOL (100% ROI)
```

---

## 🎨 Features Visuales Destacadas

### Charts Animados
- Gradientes dinámicos que cambian con YES/NO
- Glow effects y animaciones suaves
- Flash cuando hay nueva compra
- Tooltips personalizados

### Perfiles
- Avatar y banner personalizables
- Active Bets con profit/loss en tiempo real
- Estadísticas de win rate
- Markets creados

### Activity Feed
- Ver todas las compras en tiempo real
- Click en usuario → ver su perfil
- Click en market → ir al market
- Badges de YES/NO con colores

---

## 📊 Estado Actual del Proyecto

| Componente | Progreso | Estado |
|------------|----------|--------|
| UI/UX | 100% | ✅ Completo |
| Wallet Integration | 100% | ✅ Completo |
| Database | 100% | ✅ Completo |
| Comments & Social | 100% | ✅ Completo |
| **Smart Contract** | **95%** | 🟡 Testing |
| Frontend ↔ SC Integration | 0% | ❌ Pendiente |
| Escrow System | 0% | ❌ Pendiente |
| Oracle/Resolution | 50% | 🟡 Manual |

**Progreso Global: ~75%**

---

## 🔧 Setup Local

### Requisitos
- Node.js 18+
- Rust + Solana CLI
- Anchor Framework
- Phantom Wallet

### Instalación

1. **Clonar repo**
```bash
git clone https://github.com/Lord14sol/Djinn-pmarket.git
cd Djinn-pmarket
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar Supabase**
```bash
cp .env.example .env.local
# Agregar tus credenciales de Supabase
```

4. **Compilar smart contract**
```bash
cd programs/djinn-market
anchor build
```

5. **Deploy a devnet**
```bash
anchor deploy
```

6. **Correr frontend**
```bash
npm run dev
```

Visita `http://localhost:3003`

---

## 🎯 Roadmap

### ✅ Fase 1: MVP Frontend (Completo)
- [x] Diseño UI/UX
- [x] Wallet integration
- [x] Database setup
- [x] Comments system
- [x] User profiles

### 🟡 Fase 2: Smart Contract (En Progreso)
- [x] Core logic
- [x] Fee structure
- [ ] Testing exhaustivo
- [ ] Escrow accounts
- [ ] Deploy a devnet

### ❌ Fase 3: Integration (Pendiente)
- [ ] Conectar frontend con SC
- [ ] Actualizar funciones de trading
- [ ] Integrar resolución
- [ ] Testing end-to-end

### ❌ Fase 4: Production (Pendiente)
- [ ] Auditoría de seguridad
- [ ] Deploy a mainnet
- [ ] Liquidez inicial
- [ ] Marketing y launch

---

## 🔐 Seguridad

- ✅ Row Level Security (RLS) en Supabase
- ✅ PDA (Program Derived Addresses) en smart contract
- ✅ Authority checks para resolución
- ⚠️ **Pendiente:** Auditoría profesional antes de mainnet

---

## 🤝 Contribuir

Este es un proyecto personal en desarrollo. Si quieres contribuir:
1. Fork el repo
2. Crea un branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

MIT License - ver [LICENSE](LICENSE)

---

## 👤 Autor

**Lord14sol**
- GitHub: [@Lord14sol](https://github.com/Lord14sol)
- Proyecto: [Djinn Prediction Market](https://github.com/Lord14sol/Djinn-pmarket)

---

## 🙏 Agradecimientos

- Solana Foundation
- Anchor Framework
- Supabase Team
- Prediction market protocols: Polymarket, Augur, Gnosis

---

**Djinn** - *Predice el futuro. Gana en el presente.* 🔮
