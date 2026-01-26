#!/bin/bash
# Script para pre-calentar el cache de Next.js
# Ejecutar después de npm run dev

echo "🔥 Calentando cache de Next.js..."
sleep 3  # Esperar que el servidor inicie

# Pre-compilar páginas principales
curl -s http://localhost:3000 > /dev/null && echo "✓ Homepage precargada"
curl -s http://localhost:3000/markets > /dev/null && echo "✓ Markets precargada"
curl -s http://localhost:3000/genesis > /dev/null && echo "✓ Genesis precargada"

# Pre-compilar template de páginas de mercado (esto compila el componente [slug])
echo "🎯 Precalentando páginas de mercados..."
# Precargar cualquier market que exista (ajusta el slug según tus markets)
curl -s http://localhost:3000/market/dar-mkuf3t8y > /dev/null 2>&1 && echo "  ✓ Template de market precargado" || echo "  ⚠ Market no encontrado, pero template compilado"

echo ""
echo "✅ Cache caliente! Páginas deberían cargar en 1-3s ahora."
echo "💡 Tip: Primera visita a un mercado nuevo tardará ~10s, recargas serán rápidas."
