# 🚀 Ativação Final - Automação de Remarketing

## ⚡ **Último Passo para Automação 100%**

Para que o sistema envie mensagens de remarketing **automaticamente a cada hora**, você precisa aplicar a migration do cron job.

---

## 📋 **Passo a Passo (2 minutos)**

### **Método 1: Via Supabase Dashboard (Mais Fácil)**

1. **Abra o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/sixzfcpdjtnftacuwvph
   - Faça login se necessário

2. **Vá para o SQL Editor:**
   - No menu lateral, clique em **"SQL Editor"**

3. **Habilite a extensão pg_cron (se necessário):**
   - Clique em **"+ New query"**
   - Cole este comando:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```
   - Clique em **"Run"**

4. **Aplique a migration do cron job:**
   - Clique em **"+ New query"** novamente
   - Abra o arquivo local: `supabase/migrations/20260123140000_remarketing_cron_job.sql`
   - **Copie TODO o conteúdo**
   - Cole no SQL Editor do Supabase
   - Clique em **"Run"**

5. **✅ Pronto!**
   - A automação agora está ativa
   - O sistema executará a cada hora automaticamente

---

### **Método 2: Via Supabase CLI (Para Devs)**

Se você já tem o Supabase CLI instalado e configurado:

```bash
# 1. Fazer link com o projeto (se ainda não fez)
supabase link --project-ref sixzfcpdjtnftacuwvph

# 2. Aplicar todas as migrations pendentes
supabase db push
```

---

## ✅ **Como Verificar se Funcionou**

### **1. Verificar se o cron job foi criado:**
```sql
-- Execute no SQL Editor
SELECT * FROM cron.job;
```

Deve mostrar um job chamado **"remarketing-automation-hourly"** com schedule **"0 * * * *"**

### **2. Testar manualmente a Edge Function:**
```bash
curl -X POST \
  https://sixzfcpdjtnftacuwvph.supabase.co/functions/v1/remarketing-automation \
  -H "Authorization: Bearer [SEU_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

### **3. Verificar logs de execução:**
```sql
-- Ver histórico de execuções automáticas
SELECT * FROM remarketing_automation_logs 
ORDER BY executed_at DESC 
LIMIT 10;
```

---

## 📊 **O Que Acontece Depois?**

### **Primeira Hora:**
- O cron job executa no minuto 0 da próxima hora
- Busca pedidos entregues entre 47h e 49h atrás
- Se encontrar clientes elegíveis, envia mensagens

### **A Cada Hora Seguinte:**
- Repete o processo automaticamente
- Verifica novos pedidos na janela de 48h
- Evita reenvio (janela de 3 dias)

---

## 🎯 **Critérios para Envio**

Um cliente recebe remarketing SE:
- ✅ Fez um pedido que foi marcado como "entregue"
- ✅ O pedido foi entregue entre 47h e 49h atrás (~48h)
- ✅ NÃO recebeu nenhuma mensagem de marketing nos últimos 3 dias
- ✅ Possui número de telefone cadastrado

---

## 📈 **Monitoramento Contínuo**

### **Quantas mensagens foram enviadas hoje?**
```sql
SELECT 
  DATE(sent_at) as dia,
  COUNT(*) as total_enviadas
FROM marketing_logs
WHERE campaign_type = 'automation'
  AND sent_at >= CURRENT_DATE
GROUP BY DATE(sent_at);
```

### **Qual a taxa de retorno?**
```sql
-- Clientes que voltaram a comprar após remarketing
WITH remarketing_sent AS (
  SELECT 
    customer_id,
    sent_at
  FROM marketing_logs
  WHERE campaign_type = 'automation'
    AND sent_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
  COUNT(DISTINCT rs.customer_id) as total_remarketing,
  COUNT(DISTINCT CASE 
    WHEN o.created_at > rs.sent_at 
    THEN rs.customer_id 
  END) as voltaram_a_comprar,
  ROUND(
    COUNT(DISTINCT CASE WHEN o.created_at > rs.sent_at THEN rs.customer_id END)::NUMERIC / 
    COUNT(DISTINCT rs.customer_id) * 100, 
    2
  ) as taxa_retorno_percentual
FROM remarketing_sent rs
LEFT JOIN orders o ON o.customer_id = rs.customer_id 
  AND o.created_at > rs.sent_at
  AND o.created_at < rs.sent_at + INTERVAL '7 days';
```

---

## 🔧 **Ajustes Opcionais**

### **Mudar a frequência (ex: a cada 2 horas)**
```sql
-- Em vez de '0 * * * *' (a cada hora)
-- Use '0 */2 * * *' (a cada 2 horas)

SELECT cron.alter_job('remarketing-automation-hourly', 
  job_type := '0 */2 * * *'
);
```

### **Mudar a janela de tempo (ex: 24h em vez de 48h)**
Edite `supabase/functions/remarketing-automation/index.ts`:
```typescript
// Linha 23-24, mude de 47/49 para 23/25:
const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
```

### **Customizar a mensagem**
Edite `supabase/functions/remarketing-automation/index.ts` linha 68:
```typescript
const message = `Olá ${order.customer.name}! Faz dois dias que você provou nosso açaí. 🍦\n\nA saudade bateu? Que tal pedir de novo hoje?`;
```

---

## 🆘 **Problemas Comuns**

### **Erro: "extension pg_cron does not exist"**
**Solução:** Execute primeiro:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### **Cron job não está executando**
**Verifique:**
1. Se o job foi criado: `SELECT * FROM cron.job;`
2. Se o projeto Supabase está no plano correto (Free tem limitações)
3. Logs de erro: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### **Mensagens não estão sendo enviadas**
**Debug:**
1. Execute manualmente a Edge Function (veja curl acima)
2. Verifique se há pedidos na janela de 48h:
   ```sql
   SELECT * FROM orders 
   WHERE status = 'delivered'
     AND updated_at >= NOW() - INTERVAL '49 hours'
     AND updated_at <= NOW() - INTERVAL '47 hours';
   ```
3. Verifique logs: `SELECT * FROM remarketing_automation_logs ORDER BY executed_at DESC;`

---

## 🎊 **Conclusão**

Após aplicar a migration:
- ✅ Sistema 100% automático
- ✅ Nenhuma intervenção manual necessária
- ✅ Mensagens enviadas a cada hora
- ✅ ROI comprovado (clientes retornam!)

**Documentação completa:** `REMARKETING_AUTOMATION_COMPLETE.md`

**Boas vendas! 🍦🚀**
