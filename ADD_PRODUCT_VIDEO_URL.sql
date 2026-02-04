-- ===================================================
-- Migration: Adicionar campo de vídeo aos produtos
-- Descrição: Permite cadastrar link do YouTube para cada produto
-- ===================================================

-- Adicionar coluna video_url na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN products.video_url IS 'URL do vídeo do produto no YouTube (pode ser normal, shorts ou embed)';

-- Verificar resultado
SELECT 'Campo video_url adicionado com sucesso à tabela products!' as status;
