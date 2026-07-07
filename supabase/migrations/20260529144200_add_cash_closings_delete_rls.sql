-- ═══════════════════════════════════════════════════════════════
-- Permissão de Exclusão de Fechamento de Caixa (Cash Closings RLS)
-- ═══════════════════════════════════════════════════════════════

-- Remove políticas de exclusão existentes se houver
DROP POLICY IF EXISTS "Authenticated deletes own cash closings" ON public.cash_closings;
DROP POLICY IF EXISTS "Allow cash closings delete for master and managers" ON public.cash_closings;
DROP POLICY IF EXISTS "cash_closings_delete_policy" ON public.cash_closings;

-- Cria nova política de exclusão
CREATE POLICY "cash_closings_delete_policy"
    ON public.cash_closings FOR DELETE
    USING (
        -- O criador do fechamento de caixa pode excluí-lo
        auth.uid() = created_by
        -- OU qualquer usuário com papel de MASTER, ADMIN ou MANAGER (Franqueados)
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
        )
    );
