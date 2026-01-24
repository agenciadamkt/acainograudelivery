#!/bin/bash

# ========================================
# DEPLOY EDGE FUNCTION - SCHEDULED CAMPAIGNS CHECK
# ========================================

echo "🚀 Deployando Edge Function: scheduled-campaigns-check"
echo ""

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não está instalado!"
    echo ""
    echo "Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Fazer login (se necessário)
echo "📝 Fazendo login no Supabase..."
supabase login

# Linkar ao projeto
echo "🔗 Linkando ao projeto..."
supabase link --project-ref sixzfcpdjtnftacuwvph

# Deploy da Edge Function
echo "🚀 Fazendo deploy da Edge Function..."
supabase functions deploy scheduled-campaigns-check

echo ""
echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "📋 Próximo passo: Teste no dashboard clicando em 'Processar Agendadas'"
