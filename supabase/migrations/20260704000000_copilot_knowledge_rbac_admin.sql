-- ====================================================
-- GrauOS Copilot — Fase 0: alinhar gestão de copilot_knowledge ao RBAC
-- ====================================================
-- A policy original ("Admins manage knowledge") checava uma lista fixa de
-- e-mails hardcoded. O sistema já tem RBAC completo (user_profiles.perfil),
-- então passamos a usar perfil = 'MASTER' — mesma regra usada em todo o
-- resto do GrauOS (ver src/contexts/PermissionContext.tsx: MASTER sempre
-- tem nível 4 em tudo). Evita manter uma segunda lista de admins fora do
-- RBAC.

DROP POLICY IF EXISTS "Admins manage knowledge" ON public.copilot_knowledge;

CREATE POLICY "Admins manage knowledge"
    ON public.copilot_knowledge FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
        )
    );
