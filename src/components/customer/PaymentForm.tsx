import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';


interface PaymentFormProps {
  amount: number;
  email: string;
  storeId: string;
  publicKey: string;
  onSuccess: (paymentId: string, status: string, paymentType: string) => void;
  onError: (error: string) => void;
}

export function PaymentForm({ amount, email, storeId, publicKey, onSuccess, onError }: PaymentFormProps) {
  const [mpReady, setMpReady] = useState(false);

  useEffect(() => {
    if (publicKey) {
      initMercadoPago(publicKey, { locale: 'pt-BR' });
      setMpReady(true);
    }
  }, [publicKey]);

  if (!publicKey) {
    return (
      <Card className="p-6 border-destructive">
        <p className="text-destructive text-sm">
          Esta loja não possui pagamento online configurado (Public Key ausente).
        </p>
      </Card>
    );
  }

  const safeAmount = Number(amount);
  if (!safeAmount || isNaN(safeAmount) || safeAmount <= 0) {
    return (
      <Card className="p-6 border-destructive">
        <p className="text-destructive text-sm">
          Valor do pedido inválido (R$ {amount}). Esvazie o carrinho, adicione os produtos novamente e tente outra vez.
        </p>
      </Card>
    );
  }

  const onSubmit = async ({ formData, selectedPaymentMethod }: any) => {
    console.log('[PaymentForm] === PAYMENT SUBMIT START ===');
    console.log('[PaymentForm] selectedPaymentMethod:', selectedPaymentMethod);
    console.log('[PaymentForm] formData:', JSON.stringify(formData, null, 2));
    console.log('[PaymentForm] formData.payment_method_id:', formData.payment_method_id);
    console.log('[PaymentForm] formData.token:', formData.token);

    let sessionToken = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        sessionToken = session.access_token;
      }
    } catch (err) {
      console.warn('[PaymentForm] Failed to get session token:', err);
    }

    return new Promise<void>((resolve, reject) => {
      // O Brick envia payment_method_id = 'pix' para PIX, ou o id do cartão para cartão
      const actualPaymentMethodId = formData.payment_method_id || selectedPaymentMethod;
      const isPix = actualPaymentMethodId === 'pix' || selectedPaymentMethod === 'bank_transfer';

      console.log('[PaymentForm] isPix:', isPix, '| actualPaymentMethodId:', actualPaymentMethodId);

      const requestBody = {
        // Common fields
        token: isPix ? undefined : formData.token, // PIX não usa token
        paymentMethodId: isPix ? 'pix' : (formData.payment_method_id || actualPaymentMethodId),
        issuerId: formData.issuer_id,
        amount: safeAmount,
        email,
        storeId,
        installments: isPix ? undefined : (formData.installments || 1),
        transactionAmount: safeAmount,
        description: `Pedido ${email}`,
        payer: {
          email,
          identification: formData.payer?.identification,
          first_name: formData.payer?.first_name,
          last_name: formData.payer?.last_name,
          entity_type: formData.payer?.entity_type,
          type: formData.payer?.type,
        },
      };

      console.log('[PaymentForm] Request body:', JSON.stringify(requestBody, null, 2));

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(requestBody),
      })
        .then((response) => {
          console.log('[PaymentForm] Response status:', response.status);
          return response.json();
        })
        .then((result) => {
          console.log('[PaymentForm] Response body:', JSON.stringify(result, null, 2));

          if (result.error) {
            throw new Error(result.error);
          }

          // Para PIX, o status será 'pending' (aguardando pagamento do QR Code)
          // Para cartão, o status será 'approved' ou 'rejected'
          const paymentType = result.payment_type_id === 'bank_transfer' ? 'pix' : (isPix ? 'pix' : 'credit_card');

          if (result.status === 'approved') {
            toast.success('Pagamento aprovado!');
            onSuccess(result.payment_id || result.id, result.status, paymentType);
            resolve();
          } else if (result.status === 'pending') {
            // PIX gera pagamento pendente — isso é SUCESSO, não erro
            toast.success('PIX gerado com sucesso! Escaneie o QR Code para pagar.');
            onSuccess(result.payment_id || result.id, result.status, paymentType);
            resolve();
          } else {
            console.error('[PaymentForm] REJECTED - status:', result.status, 'detail:', result.status_detail);
            toast.error(result.status_detail || 'Pagamento rejeitado');
            reject();
          }
        })
        .catch((error) => {
          console.error('[PaymentForm] ERROR:', error);
          const errorMsg = error.message || 'Erro ao processar pagamento';
          toast.error(errorMsg);
          onError(errorMsg);
          reject();
        });
    });

  };


  if (!mpReady) {
    return (
      <Card className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando pagamento...</span>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white">
      <Payment
        key={safeAmount}
        initialization={{
          amount: safeAmount,
          payer: {
            email,
          }
        }}
        onSubmit={onSubmit}
        customization={{
          paymentMethods: {
            bankTransfer: ['pix'],
            creditCard: "all",
            debitCard: "all",
            maxInstallments: 3,
          },
          visual: {
            style: {
              theme: 'default',
            },
            hidePaymentButton: false,
          },
        }}
        locale="pt-BR"
      />
    </Card>
  );
}