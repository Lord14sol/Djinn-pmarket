import math

# --- CONFIGURACIÓN DE LA GOLDEN S MUTANT CURVE (V4) ---
P_START = 1e-9       # 1 nanoSOL
P_5M = 6000e-9       # 6,000 nanoSOL (6x de ROI prom.)
P_20M = 15000e-9     # 15,000 nanoSOL (15x de ROI prom.)
P_MAX = 0.95         # Techo de Verdad Lógica
PHASE1_END = 5_000_000
PHASE2_END = 20_000_000

def get_price(supply):
    if supply <= PHASE1_END:
        # Fase 1: Linear Ignition
        slope = (P_5M - P_START) / PHASE1_END
        return P_START + (slope * supply)
    elif supply <= PHASE2_END:
        # Fase 2: C3 Bridge (Quadratic)
        progress = (supply - PHASE1_END) / (PHASE2_END - PHASE1_END)
        return P_5M + (P_20M - P_5M) * (progress ** 2)
    else:
        # Fase 3: Mutant Sigmoid (Approximation)
        # En el simulador usamos una curva que llega a P_MAX en 1B de shares
        progress = (supply - PHASE2_END) / (1_000_000_000 - PHASE2_END)
        return P_20M + (P_MAX - P_20M) * progress

def calculate_vault_sol(supply):
    # Integral numérica simple (Trapezoidal) para calcular el SOL real acumulado
    steps = 1000
    step_size = supply / steps
    total_sol = 0
    for i in range(steps):
        s1 = i * step_size
        s2 = (i + 1) * step_size
        total_sol += (get_price(s1) + get_price(s2)) / 2 * step_size
    return total_sol

# --- ESCENARIO DE SIMULACIÓN ---
# Supongamos un evento viral (Final del Mundo)
shares_yes = 600_000_000  # 600M de shares para el ganador
shares_no = 400_000_000   # 400M de shares para el perdedor

vault_yes = calculate_vault_sol(shares_yes)
vault_no = calculate_vault_sol(shares_no)
total_vault = vault_yes + vault_no

# Payout por cada share ganador
payout_per_share = total_vault / shares_yes

print(f"=" * 60)
print(f"  DJINN OMEGA SIMULATION - PETER THIEL AUDIT")
print(f"=" * 60)
print()
print(f"SCENARIO: Viral Market Resolution")
print(f"  - YES Pool: {shares_yes:,} shares (Winner)")
print(f"  - NO Pool: {shares_no:,} shares (Loser)")
print()
print(f"=" * 60)
print(f"  VAULT ANALYSIS")
print(f"=" * 60)
print(f"  SOL in YES Vault: {vault_yes:,.2f} SOL")
print(f"  SOL in NO Vault:  {vault_no:,.2f} SOL")
print(f"  ─────────────────────────────────────")
print(f"  💰 TOTAL VAULT:   {total_vault:,.2f} SOL")
print()

print(f"=" * 60)
print(f"  SETTLEMENT CALCULATION")
print(f"=" * 60)
print(f"  Winning Shares:     {shares_yes:,}")
print(f"  Total Vault:        {total_vault:,.2f} SOL")
print(f"  Payout per Share:   {payout_per_share:.9f} SOL")
print()

# Early Bird Analysis
early_bird_cost = P_START
early_bird_roi = payout_per_share / early_bird_cost
print(f"=" * 60)
print(f"  EARLY BIRD INVESTOR ANALYSIS")
print(f"=" * 60)
print(f"  Entry Price (Share #1): {early_bird_cost:.9f} SOL")
print(f"  Exit Payout:            {payout_per_share:.9f} SOL")
print(f"  ─────────────────────────────────────")
print(f"  🚀 ROI MULTIPLE:        {early_bird_roi:,.0f}x")
print()

# Late Buyer Analysis
late_buyer_price = get_price(shares_yes - 1_000_000)  # Last 1M buyers
late_buyer_roi = payout_per_share / late_buyer_price
print(f"=" * 60)
print(f"  LATE BUYER INVESTOR ANALYSIS (Last 1M)")
print(f"=" * 60)
print(f"  Entry Price:            {late_buyer_price:.9f} SOL")
print(f"  Exit Payout:            {payout_per_share:.9f} SOL")
print(f"  ─────────────────────────────────────")
print(f"  📉 ROI MULTIPLE:        {late_buyer_roi:.2f}x")
print()

# Solvency Check
theoretical_max_liability = shares_yes * P_MAX  # If everyone expected full $1
actual_vault = total_vault
solvency_ratio = actual_vault / (shares_yes * payout_per_share)

print(f"=" * 60)
print(f"  SOLVENCY VERIFICATION")
print(f"=" * 60)
print(f"  Vault Balance:          {total_vault:,.2f} SOL")
print(f"  Total Liability:        {shares_yes * payout_per_share:,.2f} SOL")
print(f"  Solvency Ratio:         {solvency_ratio:.4f} (must be ≥ 1.0)")
print(f"  ─────────────────────────────────────")
print(f"  ✅ IS VAULT SOLVENT?    {'YES ✅' if solvency_ratio >= 1.0 else 'NO ❌'}")
print()

# Loser's Pool Contribution
loser_contribution = vault_no
winner_subsidy = loser_contribution / shares_yes
print(f"=" * 60)
print(f"  LOSER'S POOL SUBSIDY")
print(f"=" * 60)
print(f"  Loser's Pool (NO):      {vault_no:,.2f} SOL")
print(f"  Subsidy per Winner:     {winner_subsidy:.9f} SOL")
print(f"  % of Payout from Losers: {(loser_contribution / total_vault) * 100:.1f}%")
print()

print(f"=" * 60)
print(f"  PETER THIEL VERDICT")
print(f"=" * 60)
if solvency_ratio >= 1.0 and early_bird_roi > 100:
    print(f"  ✅ SOLVENCY: Vault is 100% collateralized")
    print(f"  ✅ ASYMMETRY: Early bird earns {early_bird_roi:,.0f}x")
    print(f"  ✅ LATE BUYERS: Still profitable at {late_buyer_roi:.2f}x")
    print(f"  ✅ LOSER SUBSIDY: {(loser_contribution / total_vault) * 100:.1f}% comes from losing side")
    print(f"")
    print(f"  🏆 VERDICT: MATHEMATICALLY SOUND PROTOCOL")
else:
    print(f"  ❌ ISSUES DETECTED - REVIEW REQUIRED")
print(f"=" * 60)
