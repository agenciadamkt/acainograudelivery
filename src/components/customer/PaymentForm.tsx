import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
    return new Promise<void>((resolve, reject) => {
      // Map payment method ID to simple types for our backend/frontend logic
      const paymentTypeId = selectedPaymentMethod === 'bank_transfer' ? 'pix' : 'credit_card';

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          // Common fields
          token: formData.token,
          paymentMethodId: formData.payment_method_id, // Payment Brick uses snake_case here usually
          issuerId: formData.issuer_id,
          amount: safeAmount,
          email,
          storeId,
          installments: formData.installments,
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
        }),
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.error) {
            throw new Error(result.error);
          }

          if (result.status === 'approved' || result.status === 'pending') {
            if (result.status === 'approved') toast.success('Pagamento aprovado!');
            if (result.status === 'pending') toast.success('Pagamento gerado com sucesso!');

            // Pass payment info back
            onSuccess(result.payment_id || result.id, result.status, result.payment_type_id || paymentTypeId);
            resolve();
          } else {
            toast.error(result.status_detail || 'Pagamento rejeitado');
            reject();
          }
        })
        .catch((error) => {
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