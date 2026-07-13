-- ============================================================================
-- MÓDULO FISCAL — Fase 14: bucket privado para XML/PDF (DANFE/DANFCe)
-- Bucket NÃO público. Todo acesso é via edge function (service_role) que gera
-- signed URLs de curta duração. O cliente nunca lê o bucket diretamente.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiscal-docs', 'fiscal-docs', false)
ON CONFLICT (id) DO NOTHING;
