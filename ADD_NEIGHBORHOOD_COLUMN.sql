-- SCRIPT: ADICIONAR COLUNA DE BAIRRO
-- Adiciona a coluna 'neighborhood' na tabela 'stores' para permitir cadastro completo.

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Adiciona zip_code caso ainda não tenha (redundância segura)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Confirmação
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stores' AND column_name IN ('neighborhood', 'zip_code', 'city', 'state');
