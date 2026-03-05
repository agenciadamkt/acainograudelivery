#!/bin/bash

# Script de Preparação e Sincronização - Açaí no Grau Delivery
# Este script gera o build e sobe para o GitHub

echo "🚀 Iniciando preparação para o Git..."

# 1. Gerar o Build
echo "📦 Gerando build de produção..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Erro ao gerar o build. Abortando."
    exit 1
fi

# 2. Git Status
echo "🔍 Verificando alterações..."
git status

# 3. Perguntar sobre o commit
echo ""
echo "Deseja realizar o commit e push de todas as alterações agora? (s/n)"
read resposta

if [ "$resposta" == "s" ]; then
    echo "📝 Digite a mensagem do commit:"
    read mensagem
    
    if [ -z "$mensagem" ]; then
        mensagem="update: site updates"
    fi

    git add .
    git commit -m "$mensagem"
    git push origin main
    
    echo "🎉 Alterações enviadas para o GitHub!"
    echo "O servidor Hostinger deve atualizar automaticamente o site em alguns instantes."
else
    echo "⚠️ Operação cancelada. Não esqueça de fazer o push manualmente quando estiver pronto."
fi
