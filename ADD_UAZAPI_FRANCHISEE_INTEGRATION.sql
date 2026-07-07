-- ============================================================
-- MIGRAÇÃO: Adiciona suporte a integrações por franqueado
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Adiciona a coluna franchisee_id
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS franchisee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================

-- PASSO 2: Cria índice simples
CREATE INDEX IF NOT EXISTS idx_integrations_franchisee_id
  ON public.integrations(franchisee_id);

-- ============================================================

-- PASSO 3: Cria índice único por franqueado + nome
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_franchisee_name
  ON public.integrations(franchisee_id, name)
  WHERE franchisee_id IS NOT NULL;

-- ============================================================

-- PASSO 4: Habilita RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================

-- PASSO 5: Remove políticas antigas
DROP POLICY IF EXISTS "Admins can manage all integrations" ON public.integrations;
DROP POLICY IF EXISTS "Franchisees can manage own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Franchisees can view own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Global integrations are readable" ON public.integrations;

-- ============================================================

-- PASSO 6: Política para admins e managers
CREATE POLICY "Admins can manage all integrations" ON public.integrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ============================================================

-- PASSO 7: Política para franqueados (próprias integrações)
CREATE POLICY "Franchisees can manage own integrations" ON public.integrations
  FOR ALL
  USING (franchisee_id = auth.uid())
  WITH CHECK (franchisee_id = auth.uid());

-- ============================================================

-- PASSO 8: Integrações globais (sem franchisee_id) visíveis para todos
CREATE POLICY "Global integrations are readable" ON public.integrations
  FOR SELECT
  USING (franchisee_id IS NULL AND auth.uid() IS NOT NULL);
