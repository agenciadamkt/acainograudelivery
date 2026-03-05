#!/bin/bash

# Script de Deploy Automático - Açaí no Grau Delivery
# Este script faz o build do projeto e envia para o FTP

# Configurações do Servidor
FTP_USER="u102299210.delivery"
FTP_PASS="Crisfal1701$"
FTP_HOST="ftp.acainograu.com.br"
FTP_DIR=""  # Deixe vazio se o usuário já cair na pasta correta, ou especifique o caminho completo

echo "🚀 Iniciando processo de deploy..."

# 1. Gerar o Build
echo "📦 Gerando build de produção..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Erro ao gerar o build. Abortando deploy."
    exit 1
fi

# 2. Upload para o FTP
echo "📤 Enviando arquivos via FTP (isso pode levar alguns minutos)..."

# Entra na pasta dist e envia arquivo por arquivo mantendo a estrutura
cd dist
find . -type f -exec curl -u "$FTP_USER:$FTP_PASS" --ftp-create-dirs -T {} "ftp://$FTP_HOST/$FTP_DIR{}" \;

if [ $? -eq 0 ]; then
    echo "🎉 Deploy finalizado com sucesso!"
    echo "🌍 Acesse: http://delivery.acainograu.com.br/"
else
    echo "❌ Ocorreu um erro durante o upload FTP."
    exit 1
fi
