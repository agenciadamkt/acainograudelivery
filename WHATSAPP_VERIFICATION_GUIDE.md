# 📱 Verificação via WhatsApp - Guia de Deploy

## Visão Geral

O novo fluxo de cadastro funciona assim:

```
┌─────────────────────┐
│   ETAPA 1           │
│   Nome + WhatsApp   │
│   [Avançar] ────────┼───► Envia código via WhatsApp
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   ETAPA 2           │
│   Digitar código    │
│   [Verificar] ──────┼───► Valida o código
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   ETAPA 3           │
│   Endereço          │
│   Data Nascimento   │
│   Email (opcional)  │
│   Senha             │
│   [Criar Conta] ────┼───► Finaliza cadastro
└─────────────────────┘
```

---

## ⚡ Deploy - Passo a Passo

### 1️⃣ Executar Migration SQL

1. Acesse o **Supabase Dashboard** → **SQL Editor**
2. Cole o conteúdo do arquivo: `SETUP_WHATSAPP_VERIFICATION.sql`
3. Execute o script

---

### 2️⃣ Deploy das Edge Functions

Execute os comandos abaixo no terminal:

```bash
# Fazer login no Supabase CLI
npx supabase login

# Linkar ao projeto (substitua pelo seu project-id)
npx supabase link --project-ref SEU_PROJECT_ID

# Deploy da função de envio
npx supabase functions deploy send-whatsapp-verification

# Deploy da função de verificação
npx supabase functions deploy verify-whatsapp-code
```

---

### 3️⃣ Configurar Secrets (se necessário)

As funções já têm o token BTZap hardcoded. Se quiser usar secrets:

```bash
npx supabase secrets set BTZAP_TOKEN="4a0e432a-2717-42ed-a2cf-39127a768cd8"
```

---

## 🧪 Testando

1. Acesse `/auth` no app
2. Clique em "Criar Conta"
3. Preencha nome e WhatsApp
4. Clique em "Enviar Código"
5. Você deve receber uma mensagem no WhatsApp com um código de 6 dígitos
6. Digite o código e clique em "Verificar"
7. Complete o endereço e senha
8. Clique em "Criar Conta"

---

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Auth.tsx` | Página de cadastro com 3 etapas |
| `supabase/functions/send-whatsapp-verification/index.ts` | Envia código via WhatsApp |
| `supabase/functions/verify-whatsapp-code/index.ts` | Verifica o código digitado |
| `supabase/migrations/20260201_whatsapp_verification.sql` | Cria tabela de verificação |

---

## 🔒 Segurança

- Códigos expiram em **10 minutos**
- Ao enviar novo código, códigos anteriores são **deletados**
- Código só pode ser usado **uma vez** (marcado como verified)
- Nunca retornamos o código na resposta da API

---

## 🐛 Troubleshooting

### Código não chega no WhatsApp
1. Verifique se o token BTZap está correto
2. Verifique se o número está formatado corretamente (com DDD)
3. Verifique os logs da Edge Function no Supabase

### "Código inválido ou expirado"
1. O código expira em 10 minutos
2. Verifique se digitou todos os 6 dígitos
3. Solicite um novo código

### Erro ao criar conta
1. Verifique se o email/telefone já não está cadastrado
2. Verifique os logs do console do navegador
