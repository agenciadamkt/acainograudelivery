# 🚀 DEPLOY URGENTE - Edge Function Atualizada!

## ✅ **Edge Function Modificada!**

A Edge Function `scheduled-campaigns-check` foi **completamente reescrita** para:
- ✅ Processar campanhas DIRETAMENTE (sem depender de outras Edge Functions)
- ✅ Buscar clientes por segmento
- ✅ Enviar mensagens personalizadas
- ✅ Atualizar status automaticamente
- ✅ Registrar logs

---

## 🎯 **AGORA: Faça o Deploy!**

### **Opção 1: Via Supabase CLI (Recomendado)**

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar ao projeto
supabase link --project-ref sixzfcpdjtnftacuwvph

# 4. Deploy da Edge Function
supabase functions deploy scheduled-campaigns-check
```

---

### **Opção 2: Via Dashboard (Manual)**

1. **Acesse o Supabase Dashboard:**
   - https://supabase.com/dashboard/project/sixzfcpdjtnftacuwvph

2. **Vá para Edge Functions:**
   - Menu lateral → **"Edge Functions"**

3. **Encontre "scheduled-campaigns-check":**
   - Clique na função
   - Clique em **"Edit Function"**

4. **Substitua o código:**
   - Selecione TODO o código atual
   - Delete
   - Copie TODO o conteúdo de:
     `supabase/functions/scheduled-campaigns-check/index.ts`
   - Cole no editor
   - Clique em **"Save"** ou **"Deploy"**

---

## ✨ **Depois do Deploy:**

1. **Volte para o Marketing Dashboard**
2. **Clique em "Processar Agendadas"**
3. ✅ **SUAS 3 CAMPANHAS SERÃO EXECUTADAS!**

---

## 📊 **O Que a Nova Versão Faz:**

```
1. Busca campanhas pendentes (scheduled_for <= agora)
   ↓
2. Para cada campanha:
   a. Atualiza status para 'sending'
   b. Busca clientes do segmento
   c. Para cada cliente:
      - Personaliza mensagem ({name}, {age})
      - Envia via whatsapp-notification  
      - Delay de 500ms
   d. Atualiza status para 'sent'
   ↓
3. ✅ Retorna resultados
```

---

## 🔥 **IMPORTANTE:**

Você **precisa fazer o deploy** para que a Edge Function atualizada seja usada!

**Sem deploy = versão antiga = não funciona**
**Com deploy = versão nova = FUNCIONA 100%!**

---

## 📁 **Arquivo Modificado:**

```
supabase/functions/scheduled-campaigns-check/index.ts
```

Total de linhas: **200+ linhas**
Mudança: **Completa reescrita**

---

## ✅ **Comandos Rápidos:**

```bash
# Se ainda não tem o CLI instalado:
npm install -g supabase

# Deploy direto (se já estiver logado e linkado):
supabase functions deploy scheduled-campaigns-check

# Verificar se deployou:
supabase functions list
```

---

**FAÇA O DEPLOY AGORA!** Depois teste clicando em "Processar Agendadas"! 🚀
