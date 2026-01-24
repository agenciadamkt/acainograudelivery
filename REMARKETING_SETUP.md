# 🚀 Guia de Configuração Completa - Automação de Remarketing

## ✅ O que já está pronto

1. **Edge Function** (`supabase/functions/remarketing-automation/index.ts`)
   - Busca pedidos entregues entre 47h e 49h atrás
   - Verifica se o cliente já recebeu remarketing nos últimos 3 dias
   - Envia mensagem interativa via WhatsApp (BTZap)
   - Registra o envio na tabela `marketing_logs`

2. **Interface de Marketing** (`src/pages/admin/MarketingPage.tsx`)
   - Editor de campanhas com botões interativos
   - Filtros de segmentos (todos, novos, inativos)
   - Histórico de campanhas salvas
   - Status da automação atualizado (🟢 Ativa)

3. **GitHub Actions Workflow** (`.github/workflows/remarketing-automation.yml`)
   - Executa automaticamente a cada hora
   - Gratuito e confiável

## 🔧 Configuração Necessária

### Passo 1: Adicionar Secret no GitHub

1. Vá para o repositório no GitHub
2. Settings → Secrets and variables → Actions
3. Clique em "New repository secret"
4. Nome: `SUPABASE_SERVICE_ROLE_KEY`
5. Valor: Pegue a service role key no Supabase:
   - Acesse: https://supabase.com/dashboard/project/sixzfcpdjtnftacuwvph/settings/api
   - Copie a **service_role** key (não a publishable!)
6. Clique em "Add secret"

### Passo 2: Fazer Push do Código

```bash
cd "/Users/fabioricardo/Downloads/Açaí no Grau/App Delivery/App"
git add .
git commit -m "feat: Adiciona automação de remarketing de 48h"
git push
```

### Passo 3: Verificar a Automação

1. No GitHub, vá em **Actions**
2. Você verá o workflow "Remarketing Automation"
3. Para testar imediatamente, clique em "Run workflow"

## 📊 Como Testar

### Teste Manual Imediato

Você pode executar a Edge Function manualmente para testar:

```bash
curl -X POST \
  'https://sixzfcpdjtnftacuwvph.supabase.co/functions/v1/remarketing-automation' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_SERVICE_ROLE_KEY_AQUI'
```

### Verificar Logs

1. **Logs da Edge Function:**
   - Supabase Dashboard → Edge Functions → remarketing-automation → Logs

2. **Logs do GitHub Actions:**
   - GitHub → Actions → Remarketing Automation → Última execução

3. **Logs de Marketing:**
   - Verifique a tabela `marketing_logs` no Supabase

## 🎯 Funcionamento da Automação

### Fluxo Completo

```
┌─────────────────────────┐
│  GitHub Actions         │
│  (executa a cada hora)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Edge Function          │
│  remarketing-automation │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Busca pedidos de 48h   │
│  atrás (47h-49h window) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Verifica se já enviou  │
│  (últimos 3 dias)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Envia mensagem via     │
│  WhatsApp (BTZap)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Registra em            │
│  marketing_logs         │
└─────────────────────────┘
```

### Mensagem Enviada

```
Olá [Nome do Cliente]! Faz dois dias que você provou nosso açaí. 🍦

A saudade bateu? Que tal pedir de novo hoje?

[Botões Interativos]
┌──────────────────────┐
│  Pedir Agora 🍦      │
└──────────────────────┘
┌──────────────────────┐
│  Ver Cardápio        │
└──────────────────────┘
```

## 🛡️ Proteções Implementadas

1. **Janela de 48h precisa**: Evita enviar muito cedo ou muito tarde
2. **Cooldown de 3 dias**: Não envia múltiplas vezes para o mesmo cliente
3. **Validação de dados**: Só envia se houver telefone e customer_id
4. **Logs completos**: Rastreabilidade total dos envios

## 📈 Métricas para Acompanhar

Você pode criar queries no Supabase para acompanhar:

```sql
-- Total de envios por dia
SELECT 
  DATE(sent_at) as dia,
  COUNT(*) as total_envios
FROM marketing_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at)
ORDER BY dia DESC;

-- Taxa de conversão (se implementar tracking de cliques)
SELECT 
  status,
  COUNT(*) as total
FROM marketing_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

## 🔍 Troubleshooting

### Problema: Automação não executa

**Verificar:**
1. Secret `SUPABASE_SERVICE_ROLE_KEY` configurada corretamente
2. GitHub Actions está habilitado no repositório
3. Workflow file está na branch correta (main/master)

### Problema: Erros ao enviar WhatsApp

**Verificar:**
1. Token BTZap válido no Edge Function
2. Números de telefone no formato correto
3. Logs da Edge Function para detalhes do erro

### Problema: Mensagens duplicadas

**Verificar:**
1. Lógica de cooldown (3 dias) funcionando
2. Tabela `marketing_logs` sendo atualizada corretamente

## 🎉 Próximos Passos Sugeridos

1. **Personalização de mensagens** por segmento de cliente
2. **A/B testing** com diferentes mensagens
3. **Tracking de conversão** (rastrear cliques nos botões)
4. **Dashboard de métricas** na interface de Marketing
5. **Automações adicionais**:
   - Boas-vindas para novos clientes
   - Recuperação de carrinho abandonado
   - Programa de fidelidade

---

**Dúvidas?** Verifique os logs ou ajuste os parâmetros conforme necessário!
