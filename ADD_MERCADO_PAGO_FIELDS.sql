
-- Adicionar colunas para credenciais do Mercado Pago na tabela stores
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT;

-- Comentário para documentação
COMMENT ON COLUMN stores.mercadopago_public_key IS 'Chave pública (Public Key) do Mercado Pago para checkout transparente';
COMMENT ON COLUMN stores.mercadopago_access_token IS 'Chave de acesso (Access Token) do Mercado Pago para processamento no backend';
