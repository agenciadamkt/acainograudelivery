# Checklist de deploy — branch `feat/modulo-fiscal` → produção

**Levantado em 2026-08-06**, sondando o banco e as edge functions de produção
(`sixzfcpdjtnftacuwvph`) por requisição somente-leitura.

O merge para `main` dispara o GitHub Actions, que faz o build e publica por FTP.
São **40 commits / 199 arquivos** — não é só a sidebar.

---

## ✅ Já está em produção (verificado, não precisa fazer nada)

Ao contrário do que o registro anterior sugeria, quase tudo já foi aplicado:

- **Fiscal (tabelas):** `fiscal_certificates`, `fiscal_companies`, `fiscal_documents`,
  `fiscal_events`, `fiscal_logs`, `fiscal_series`, `product_fiscal_data`
- **Caixa:** `cash_closings`, `cash_closing_documents`, `cash_operators`,
  `pdv_cash_registers`, `pdv_cash_movements`, `pdv_cash_conference`
- **RBAC:** `user_profiles`, `user_unidades`, `rbac_modulos`,
  `rbac_perfil_permissoes`, `rbac_usuario_permissoes`
- **CheckGrau:** `checkgrau_collaborators`, `checkgrau_collaborator_stores`,
  `checkgrau_messages`, `checkgrau_message_reads`, `checkgrau_notifications`,
  `checkgrau_points`
- **Operações:** todas as tabelas de M1, M2 e M4
- **Demais:** CRM, recibos, fornecedores, promoções, vídeos, frota, contagens
  recorrentes, auditorias, WhatsApp

---

## ❌ Falta antes do deploy

### 1. Duas tabelas não existem

| Tabela | SQL a rodar | Quebra o quê |
|---|---|---|
| `checkgrau_collaborator_notes` | `ADD_CHECKGRAU_COLLABORATOR_NOTES.sql` | Notas do colaborador em `CollaboratorDetailDialog` (CheckGrau) |
| `ai_analysis` | `ADD_OPERATIONS_M5.sql` | Análise por IA das rotinas (`operations-ai`) |

Rodar no Supabase → SQL Editor, na ordem acima.

### 2. Oito edge functions não publicadas

```
fiscal-cancelar     fiscal-certificado   fiscal-consultar   fiscal-documento
fiscal-emitir       fiscal-empresa       fiscal-webhook     operations-alerts
```

**Este é o item mais sério.** As sete `fiscal-*` são o back-end inteiro do
módulo fiscal. As telas Dashboard Fiscal e Histórico Fiscal aparecem para quem
tem papel `manager` — ou seja, **os franqueados** — e hoje toda ação de emitir,
cancelar ou consultar nota responderia 404.

Publicar com:

```bash
supabase functions deploy fiscal-cancelar --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy fiscal-certificado --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy fiscal-consultar --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy fiscal-documento --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy fiscal-emitir --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy fiscal-empresa --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy fiscal-webhook --project-ref sixzfcpdjtnftacuwvph
supabase functions deploy operations-alerts --project-ref sixzfcpdjtnftacuwvph
```

Exige `supabase login` (interativo — rode você mesmo). Confira antes se as
variáveis de ambiente que essas funções usam (chaves do PlugNotas / Focus NFe)
estão configuradas em Project Settings → Edge Functions → Secrets.

---

## Como conferir de novo depois

Sondagem somente-leitura, não altera nada:

```bash
set -a && . ./.env && set +a
for t in checkgrau_collaborator_notes ai_analysis; do
  printf "%-36s %s\n" "$t" \
    "$(curl -s -o /dev/null -w '%{http_code}' \
       -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
       -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" \
       "$VITE_SUPABASE_URL/rest/v1/$t?select=*&limit=1")"
done   # 200 = existe, 404 = falta

for f in fiscal-emitir fiscal-webhook operations-alerts; do
  printf "%-24s %s\n" "$f" \
    "$(curl -s -o /dev/null -w '%{http_code}' -X POST \
       -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
       -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" \
       -H 'Content-Type: application/json' -d '{}' \
       "$VITE_SUPABASE_URL/functions/v1/$f")"
done   # 401/400 = publicada, 404 = falta
```

---

## Deploy, depois que os itens acima estiverem resolvidos

```bash
git checkout main
git merge feat/modulo-fiscal
git push origin main     # dispara o GitHub Actions → build → FTP
```

A sidebar V2 em si **não depende de nenhum item pendente** — não usa tabela nem
função nova. O que está travando o deploy é o módulo fiscal.
