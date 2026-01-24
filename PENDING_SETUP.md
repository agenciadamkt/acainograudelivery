# Ajustes Necessários para Funcionamento Perfeito

Análise realizada em 19/01/2026 com base na documentação e estado do ambiente.

## 🚨 Status Crítico: Deploy Pendente

As seguintes **Edge Functions** (Backend Serverless) constam na documentação mas **não estão deployadas** no projeto Supabase atual. Isso impede o funcionamento de funcionalidades chave:

| Função | Funcionalidade Afetada | Status Atual |
| :--- | :--- | :--- |
| `infinitepay-create-checkout` | Pagamentos via InfinitePay (Link) | ❌ Inoperante |
| `infinitepay-webhook` | Confirmação automática de pagamento | ❌ Inoperante |
| `send-push-notification` | Notificações Push (som de pedido) | ❌ Inoperante |
| `validate-customer` | Validação prévia de cadastro | ⚠️ Corrigido com Fallback (Funciona) |
| `create-franchisee` | Cadastro de franqueado | ⚠️ Corrigido com Fallback (Funciona) |

## ✅ Correções Realizadas (Workarounds)

Para garantir que o sistema funcione **agora**, realizei as seguintes alterações no código Frontend:

1.  **Cadastro de Franqueado (`useCreateFranchisee`)**: 
    - Implementado modo direto que cria Usuário + Loja + Permissões sem depender da Edge Function.
2.  **Cadastro de Cliente (`AuthContext`)**:
    - Adicionado fallback para ignorar falha na validação prévia. O cadastro é tentado diretamente e o banco de dados garante a unicidade (CPF/Email).
3.  **Notificações Push**:
    - Bloqueio de erros quando chaves VAPID não estão configuradas.

## 🛠️ Ação Necessária (Para "Perfeição")

Para habilitar Pagamentos Online e Notificações Reais, você deve:

1.  **Deployar as Edge Functions**:
    ```bash
    npx supabase login
    npx supabase functions deploy infinitepay-create-checkout --project-ref sixzfcpdjtnftacuwvph
    npx supabase functions deploy infinitepay-webhook --project-ref sixzfcpdjtnftacuwvph
    npx supabase functions deploy send-push-notification --project-ref sixzfcpdjtnftacuwvph
    ```
    *(Nota: Se você quiser usar a versão original das funções de cadastro e validação, deploye também `create-franchisee` e `validate-customer`)*

2.  **Configurar Segredos (Secrets) no Supabase**:
    Vá nas configurações do projeto (Settings -> Edge Functions ou Secrets) e adicione:
    - `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY` (Web Push)
    - `INFINITEPAY_API_KEY` (Pagamentos) (Confira o nome exato usado no código, ex. `INFINITEPAY_CLIENT_ID` etc.)
    - `MERCADOPAGO_ACCESS_TOKEN` (Se usar MercadoPago)

Sem isso, apenas "Pagamento na Entrega" funcionará corretamente.
