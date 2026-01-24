# 🚨 CORREÇÃO URGENTE - Erro de Agendamento

## ❌ **Problema Identificado**
Erro: `Could not find the table 'public.scheduled_campaigns' in the schema cache`

**Causa:** A tabela `scheduled_campaigns` ainda não foi criada no banco de dados.

---

## ✅ **Solução - 2 Minutos**

### **Passo 1: Abra o Supabase Dashboard**
1. Acesse: https://supabase.com/dashboard/project/sixzfcpdjtnftacuwvph
2. Faça login se necessário

### **Passo 2: Vá para o SQL Editor**
1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique em **"+ New query"**

### **Passo 3: Copie e Execute o SQL**
1. Abra o arquivo: `supabase/migrations/20260123141500_marketing_complete_system.sql`
2. **Copie TODO o conteúdo** (174 linhas)
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (botão verde/roxo)

### **Passo 4: Verifique se Funcionou**
Execute este comando para verificar:
```sql
SELECT COUNT(*) FROM scheduled_campaigns;
```
Deve retornar `0` (sem erros)

---

## 📋 **O Que Esta Migration Faz**

Esta migration cria:
- ✅ Tabela `scheduled_campaigns` (para agendamento)
- ✅ Coluna `birth_date` em `customers` (para aniversariantes)
- ✅ Views de aniversariantes (hoje e mês)
- ✅ Função de estatísticas de campanhas
- ✅ Políticas RLS (segurança)
- ✅ Triggers automáticos

---

## 🎯 **Após Aplicar**

1. **Volte para o Marketing Dashboard**
2. **Tente agendar novamente**
3. ✅ **Funcionará perfeitamente!**

---

## 🆘 **Se Der Erro**

### **Erro: "permission denied for table scheduled_campaigns"**
Execute também:
```sql
GRANT ALL ON scheduled_campaigns TO authenticated;
GRANT ALL ON scheduled_campaigns TO service_role;
```

### **Erro: "relation marketing_campaigns does not exist"**
Execute primeiro a migration anterior (se houver)

---

## ✨ **Após Corrigir**

Você poderá:
- ✅ Agendar campanhas para data/hora específicas
- ✅ Ver lista de campanhas agendadas
- ✅ Sistema executará automaticamente no horário definido

**Tempo total: ~2 minutos** ⏱️
