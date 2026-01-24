#!/bin/bash

# Script de teste para a automação de remarketing
# Execute este script para testar manualmente a Edge Function

echo "🧪 Testando Edge Function de Remarketing..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL da Edge Function
FUNCTION_URL="https://sixzfcpdjtnftacuwvph.supabase.co/functions/v1/remarketing-automation"

# Verificar se a service role key foi fornecida
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Service Role Key não fornecida${NC}"
    echo ""
    echo "Uso: ./test-remarketing.sh YOUR_SERVICE_ROLE_KEY"
    echo ""
    echo "Para obter a service role key:"
    echo "1. Acesse: https://supabase.com/dashboard/project/sixzfcpdjtnftacuwvph/settings/api"
    echo "2. Copie a 'service_role' key"
    echo ""
    exit 1
fi

SERVICE_KEY="$1"

echo -e "${YELLOW}📡 Enviando requisição para Edge Function...${NC}"
echo ""

# Fazer a requisição
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{}')

# Separar body e status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

echo "Status HTTP: $HTTP_STATUS"
echo ""
echo "Resposta:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Verificar sucesso
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Teste executado com sucesso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Verifique os logs no Supabase Dashboard"
    echo "2. Confira a tabela 'marketing_logs' para ver os envios"
    echo "3. Se houver pedidos elegíveis, mensagens foram enviadas!"
else
    echo -e "${RED}❌ Erro na execução${NC}"
    echo ""
    echo "Verifique:"
    echo "1. Service Role Key correta"
    echo "2. Edge Function deployed"
    echo "3. Logs do Supabase para mais detalhes"
fi

echo ""
