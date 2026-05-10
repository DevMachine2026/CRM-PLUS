#!/usr/bin/env bash
set -euo pipefail

echo "=== CRM PLUS — Setup do ambiente local ==="

# Pré-requisitos
command -v docker >/dev/null 2>&1 || { echo "❌  Docker não encontrado. Instale em https://docker.com"; exit 1; }
command -v npx   >/dev/null 2>&1 || { echo "❌  Node.js/npm não encontrado."; exit 1; }

# Supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  echo "→ Instalando Supabase CLI..."
  npm install -g supabase
fi

# .env.local
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "→ .env.local criado. Preencha GOOGLE_AI_API_KEY antes de continuar."
  echo "  Obtenha grátis em: https://aistudio.google.com"
  echo ""
  read -p "Pressione ENTER após preencher o .env.local..."
fi

# Supabase local
if ! supabase status 2>/dev/null | grep -q "API URL"; then
  echo "→ Iniciando Supabase local (Docker)..."
  supabase start
fi

echo "→ Aplicando schema Prisma no banco local..."
npx prisma db push --skip-generate

echo "→ Rodando seed com dados de teste..."
npx tsx prisma/seed.ts

echo ""
echo "✅  Ambiente pronto!"
echo "   Banco:    postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo "   Studio:   http://localhost:54323"
echo "   App:      npm run dev → http://localhost:3000"
echo ""
echo "   Login de teste:"
echo "   Email:    admin@acme.com.br"
echo "   Senha:    senha123"
