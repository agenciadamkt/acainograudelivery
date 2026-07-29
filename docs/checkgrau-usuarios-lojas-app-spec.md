# CheckGrau — Usuários, Lojas & App Operador (expansão)

**Data:** 2026-07-16 · Separa **Painel Web (admin)** do **App Operador (mobile)**, com colaboradores
por WhatsApp+OTP e gestão multiunidade. Segue os módulos M1–M6 já construídos.

## Decisões (2026-07-16)
1. **Colaborador** = tabela própria `checkgrau_collaborators` (perfil/cargo/status) **+ login
   WhatsApp+OTP que cria/associa um usuário Supabase Auth por telefone** → sessão real, RLS funciona.
2. **Reconciliação M1–M6**: rotinas/tarefas ganham `collaborator_id` (mantendo `responsible_user_id`).
3. **App mobile** = rotas mobile-first no app atual (PWA), área `/colaborador/*`; build nativo depois.
4. **Lojas** = reusar `stores` (já multiempresa/multiloja); adicionar `code`/`status` se faltar.

## Decomposição (blocos)
- **Bloco A — Fundação + Admin** *(este spec / primeiro)*: modelo de dados (colaboradores, vínculo
  N:N com lojas, cargos), páginas admin **Colaboradores** e **Lojas**, `collaborator_id` nas
  rotinas/tarefas, menu admin.
- **Bloco B — Auth mobile**: WhatsApp+OTP → sessão Supabase (telefone) + seleção de loja.
- **Bloco C — App Operador** (`/colaborador/*`): home, tarefas (pendentes/dia/atrasadas/concluídas),
  execução (reusa M1/M2), evidências, notificações.
- **Bloco D — Dashboards web por colaborador**: visão por colaborador + ranking (estende M3/M4/M6).

---

## Bloco A — modelo de dados (`ADD_CHECKGRAU_COLLABORATORS.sql`)

### `checkgrau_collaborators`
```
id            uuid pk
company_id    uuid            -- empresa (grupo de lojas); deriva de stores.company_id
auth_user_id  uuid null → auth.users(id)   -- vínculo criado no 1º login por telefone
name          text
whatsapp      text            -- identificador de login (E.164, ex: +5586999999999)
cpf           text
cargo         text            -- operador | lider | supervisor | franqueado
photo_url     text
status        text            -- ativo | inativo | afastado | desligado
created_at, updated_at
UNIQUE (whatsapp)
```

### `checkgrau_collaborator_stores` (N:N colaborador × loja)
```
collaborator_id uuid → checkgrau_collaborators(id) on delete cascade
store_id        uuid → stores(id) on delete cascade
PRIMARY KEY (collaborator_id, store_id)
```

### Ajustes
- `stores`: add `code text` e `status text default 'ativo'` (se não existirem).
- `inventory_checklist_routines` e `inventory_checklist_schedules`: add `collaborator_id uuid → checkgrau_collaborators(id)`.

RLS `authenticated` (padrão atual do módulo — o débito multi-tenant já está registrado).

## Bloco A — Admin (web)

Menu **Admin › CheckGrau** ganha os cadastros (grupo "Cadastros"): **Lojas** e **Colaboradores**
(além do que já existe: Painel, Rankings, Rede, Alertas, Agenda, Rotinas, Checklists,
Setores & Turnos, Contagens).

- `/admin/checkgrau/stores` — CRUD de lojas (nome, código, endereço, cidade, estado, telefone,
  status) sobre a tabela `stores`.
- `/admin/checkgrau/collaborators` — CRUD de colaboradores (nome, whatsapp, cpf, cargo, foto,
  status) + **vínculo com lojas** (N:N). Só perfis administrativos (franqueado/supervisor/gestor).

Camada: `src/pages/admin/checkgrau/{StoresPage,CollaboratorsPage}.tsx` ·
`src/hooks/checkgrau/{useCheckgrauStores,useCollaborators}.ts` · rotas no CheckGrauLayout.

## Papéis (cargos)
`operador` (executa) · `lider` (executa + valida equipe) · `supervisor` (várias lojas + alertas) ·
`franqueado` (só web, gerencia tudo). O painel web é para franqueado/supervisor/gestor; o app é
para operador/líder/supervisor operacional.

## Fora do Bloco A
Login mobile (Bloco B), app operador (Bloco C), dashboards por colaborador (Bloco D).
