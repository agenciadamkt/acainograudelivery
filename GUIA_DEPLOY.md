# Guia de Deploy — Módulo Fiscal (multi-provedor) + RBAC + Correções

Consolidação de tudo que precisa ser aplicado no Supabase para colocar em produção
o **Módulo Fiscal multi-provedor (PlugNotas + Focus NFe)**, o **RBAC 100% nas rotas**
e as correções desta sessão.

> **Provedores:** o módulo suporta **PlugNotas (TecnoSpeed)** e **Focus NFe**, escolhidos
> por loja em *Configurações PDV → Fiscal → Geral → Provedor fiscal*. O PlugNotas está
> em standby (custo); a Focus NFe é a opção ativa no momento. O mesmo token cifrado e as
> mesmas edge functions atendem os dois — só muda o provedor selecionado.

> Legenda de status: ✅ já aplicado · ⏳ pendente

---

## 1. Migrations (SQL Editor do Supabase)

Rode **na ordem abaixo**. Todas são idempotentes.

| Ordem | Arquivo | O que faz | Status |
|------:|---------|-----------|:------:|
| 1 | `20260712000000_add_store_fiscal_social_fields.sql` | CNPJ/Razão/Inscrições/redes na `stores` | ✅ |
| 2 | `20260712100000_pdv_cash_shift_evolution.sql` | Evolução do Caixa (turnos) | ✅ |
| 3 | `20260712140000_fiscal_module.sql` | 7 tabelas fiscais + `product_fiscal_data` + RLS + CRT/IBGE | ✅ |
| 4 | `20260712150000_fiscal_token_crypto.sql` | RPCs pgcrypto do token (fix `extensions`) | ✅ |
| 5 | `20260713140000_stores_update_policy_managers.sql` | Gestores da loja podem editar `stores` (fix "não salva") | ✅ |
| 6 | `20260713120000_fiscal_docs_bucket.sql` | Bucket **privado** `fiscal-docs` (XML/PDF) | ⏳ |
| 7 | `20260713150000_rbac_modulos_sync_completo.sql` | Semeia **todos** os módulos em `rbac_modulos` (fix FK ao salvar usuário) | ⏳ |
| 8 | `20260713160000_rbac_modulos_hub_novos.sql` | Módulos novos do Hub: Agenda, Performance, Assistente, Fiscal | ⏳ |
| 9 | `20260713170000_rbac_defaults_por_perfil.sql` | Defaults por perfil (blinda FRANQUEADO/COLABORADOR contra lockout) | ⏳ |
| 10 | `20260713180000_fiscal_provider.sql` | Coluna `fiscal_companies.provider` (plugnotas \| focusnfe) | ✅ |

> **Importante:** 7 → 8 → 9 têm dependência (defaults precisam dos módulos existirem). Rode nessa ordem.

---

## 2. Secrets das Edge Functions (Supabase → Edge Functions → Secrets)

| Secret | Uso | Sugestão |
|--------|-----|----------|
| `FISCAL_ENCRYPTION_KEY` | Cifra/decifra o token do provedor (pgcrypto) — vale p/ PlugNotas **e** Focus | string forte, 32+ caracteres |
| `FISCAL_WEBHOOK_SECRET` | Valida o webhook (PlugNotas e gatilhos da Focus) | string forte, 24+ caracteres |

(As functions já herdam `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
Não há secret específico da Focus — o token dela é salvo cifrado pelo mesmo fluxo.)

---

## 3. Deploy das Edge Functions

```bash
supabase functions deploy fiscal-empresa
supabase functions deploy fiscal-certificado
supabase functions deploy fiscal-emitir
supabase functions deploy fiscal-consultar
supabase functions deploy fiscal-documento
supabase functions deploy fiscal-cancelar
# O webhook NÃO exige JWT (quem chama é o provedor):
supabase functions deploy fiscal-webhook --no-verify-jwt
```

> As 7 functions já são **multi-provedor** (PlugNotas e Focus NFe). Não há functions
> separadas por provedor — o roteamento é interno, pela coluna `provider` da loja.

---

## 4. Webhook (mesma URL para os dois provedores)

Cadastrar a URL de callback (usando o mesmo valor do `FISCAL_WEBHOOK_SECRET`):

```
https://<SEU-PROJETO>.supabase.co/functions/v1/fiscal-webhook?secret=<FISCAL_WEBHOOK_SECRET>
```

- **PlugNotas:** cadastrar no painel PlugNotas.
- **Focus NFe:** cadastrar em **Gatilhos/Webhooks** no painel da Focus (mesma URL).

> O webhook é agnóstico: ao receber o aviso, ele **consulta o provedor** para o status
> autoritativo — funciona mesmo com os formatos de callback diferentes.

---

## 5. Build do frontend

```bash
npm run build
```

(Deploy do `dist/` conforme seu fluxo — Hostinger/CI. Já embute RBAC nas rotas, Hub por permissão, aba Fiscal em Configurações PDV, etc.)

---

## 6. Configuração inicial por loja (após deploy)

Em **Configurações PDV → aba Fiscal**:

1. **Geral** → escolher o **Provedor fiscal** (PlugNotas ou **Focus NFe**) + **ambiente**
   (comece por *homologação/sandbox*); salvar o **token do provedor**; **Testar conexão**.
2. **Empresa** → preencher **CRT (regime)** + **código IBGE**; clicar **Cadastrar/Sincronizar**.
3. **Certificados** → enviar o **.pfx (A1)** + senha.
4. **Séries** → conferir série/próximo número (opcional).
5. **Impressão** → logo/rodapé da DANFE (opcional).

Pré-requisito de dados para emitir de verdade: preencher **`product_fiscal_data`**
(NCM/CFOP/CEST/origem/CST) dos produtos que serão vendidos.

### Diferenças por provedor
| Item | PlugNotas (TecnoSpeed) | Focus NFe |
|------|------------------------|-----------|
| Auth | `X-API-KEY: token` | HTTP Basic (`token:`) |
| Ambiente API | `api.plugnotas.com.br` / sandbox | `api.focusnfe.com.br` (prod) · `homologacao.focusnfe.com.br` |
| Referência do doc | id retornado na emissão | **ref = id do documento** (definido por nós) |
| Certificado | endpoint próprio (`/certificado`) | enviado **junto da empresa** (`PUT /v2/empresas/{id}`) |
| Status | CONCLUIDO/REJEITADO/CANCELADO… | autorizado/erro_autorizacao/cancelado/processando_autorizacao |

> Os payloads da Focus foram montados pela doc/experiência e devem ser **validados no
> sandbox** (regime tributário, campos de item, retorno de validade do certificado,
> formato do gatilho/webhook).

---

## 7. Verificação pós-deploy (checklist)

- [ ] Editar um usuário e salvar permissões → **sem erro de FK**.
- [ ] Usuário staff (ex: jhonathan) vê no Hub **só** os cards que tem permissão e acessa a **Frota**.
- [ ] Master (e-mail admin ou `franchisee_master`) vê **tudo**.
- [ ] Salvar Razão Social em **Dados da Loja** → persiste.
- [ ] Fiscal → escolher **provedor** + **Testar conexão** retorna OK.
- [ ] Emitir uma NFC-e de teste → status vira **PROCESSANDO** e depois **AUTORIZADO** (webhook/consulta).
- [ ] Baixar **DANFE/XML** e **Cancelar** funcionam.
- [ ] (Focus) Trocar o provedor para **Focus NFe**, sincronizar empresa, enviar certificado e emitir — validar payloads no sandbox.

---

## Notas
- **Multi-provedor**: PlugNotas e Focus NFe atrás da mesma UI e das mesmas 7 functions; troca por loja em Fiscal → Geral. PlugNotas em standby (custo); Focus NFe ativa.
- Fluxo fiscal é **assíncrono**: emissão nunca trava a venda; status chega por **webhook** (+ consulta como fallback).
- Nenhum segredo (token/senha/certificado) trafega ao frontend.
- Rotas 100% RBAC: se um usuário legítimo tomar "não autorizado", conceda o módulo em *Usuários* (o master nunca é afetado).
