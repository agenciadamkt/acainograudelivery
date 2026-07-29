-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Atribuição robusta de execução → colaborador
-- Antes, a execução era ligada ao colaborador pelo `completed_by` (id do usuário
-- de login). Como o número digitado com/sem "55" cria usuários diferentes, o
-- trabalho podia "sumir" do painel. Agora gravamos o collaborator_id direto na
-- execução, e este script REPARA os dados existentes.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Coluna
ALTER TABLE public.inventory_checklist_executions
  ADD COLUMN IF NOT EXISTS collaborator_id uuid REFERENCES public.checkgrau_collaborators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exec_collaborator ON public.inventory_checklist_executions(collaborator_id);

-- 2) Função auxiliar: "dígitos locais" do telefone (tira o 55 do início se houver >11 dígitos)
CREATE OR REPLACE FUNCTION public.cg_local_digits(txt text) RETURNS text AS $$
  SELECT CASE
    WHEN length(d) > 11 AND left(d, 2) = '55' THEN right(d, length(d) - 2)
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce(txt, ''), '\D', '', 'g') AS d) s;
$$ LANGUAGE sql IMMUTABLE;

-- 3) Reparo: liga cada execução ao colaborador certo comparando o telefone do
--    usuário sintético (email cg<dígitos>@checkgrau.local) com o WhatsApp do
--    colaborador — tolerante ao prefixo 55.
UPDATE public.inventory_checklist_executions e
SET collaborator_id = c.id
FROM auth.users u
JOIN public.checkgrau_collaborators c
  ON public.cg_local_digits(split_part(u.email, '@', 1)) = public.cg_local_digits(c.whatsapp)
WHERE e.completed_by = u.id
  AND e.collaborator_id IS NULL
  AND u.email LIKE 'cg%@checkgrau.local';
