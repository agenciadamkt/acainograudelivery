-- Campos fiscais e de redes sociais da loja, editáveis pelo franqueado na
-- página "Dados da Loja" (/admin/loja/dados), sem depender do administrador.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS cnpj                 text,
  ADD COLUMN IF NOT EXISTS razao_social         text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual   text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal  text,
  ADD COLUMN IF NOT EXISTS instagram            text,
  ADD COLUMN IF NOT EXISTS facebook             text,
  ADD COLUMN IF NOT EXISTS website              text;
