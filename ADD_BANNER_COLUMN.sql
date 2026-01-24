-- Adiciona a coluna banner_url na tabela stores se não existir
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS banner_url text;

-- Adiciona a coluna delivery_time na tabela stores se não existir (para garantir)
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS delivery_time text;

-- Atualiza o cache do schema (opcional, mas bom forçar)
NOTIFY pgrst, 'reload schema';
