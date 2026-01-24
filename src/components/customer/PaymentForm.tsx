import { useState } from 'react';
import { CardNumber, SecurityCode, ExpirationDate, initMercadoPago } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

if (PUBLIC_KEY) {
  initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
}

interface PaymentFormProps {
  amount: number;
  email: string;
  onSuccess: (paymentId: string, status: string) => void;
  onError: (error: string) => void;
}

export function PaymentForm({ amount, email, onSuccess, onError }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [installments, setInstallments] = useState('1');

  if (!PUBLIC_KEY) {
    return (
      <Card className="p-6 border-destructive">
        <p className="text-destructive text-sm">
          Chave pública do Mercado Pago não configurada. Entre em contato com o suporte.
        </p>
      </Card>
    );
  }

  const handlePayment = async () => {
    if (!cardholderName) {
      toast.error('Por favor, preencha o nome do titular do cartão');
      return;
    }

    setIsProcessing(true);

    try {
      // @ts-ignore - SDK types
      const cardToken = await window.MP.createCardToken({
        cardholderName,
      });

      if (cardToken.error) {
        throw new Error(cardToken.error.message || 'Erro ao processar cartão');
      }

      // Chamar edge function para processar pagamento
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            token: cardToken.id,
            amount,
            email,
            installments: parseInt(installments),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      if (result.status === 'approved') {
        toast.success('Pagamento aprovado!');
        onSuccess(result.payment_id, result.status);
      } else if (result.status === 'pending') {
        toast.warning('Pagamento pendente de aprovação');
        onSuccess(result.payment_id, result.status);
      } else {
        throw new Error(result.status_detail || 'Pagamento rejeitado');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Erro ao processar pagamento';
      toast.error(errorMsg);
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Dados do Cartão</h3>
      </div>

      <div>
        <Label>Número do Cartão</Label>
        <CardNumber placeholder="0000 0000 0000 0000" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Validade</Label>
          <ExpirationDate placeholder="MM/AA" />
        </div>
        <div>
          <Label>CVV</Label>
          <SecurityCode placeholder="123" />
        </div>
      </div>

      <div>
        <Label>Nome do Titular</Label>
        <Input
          placeholder="Nome como no cartão"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
        />
      </div>

      <div>
        <Label>Parcelas</Label>
        <Select value={installments} onValueChange={setInstallments}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1x de R$ {amount.toFixed(2)}</SelectItem>
            <SelectItem value="2">2x de R$ {(amount / 2).toFixed(2)}</SelectItem>
            <SelectItem value="3">3x de R$ {(amount / 3).toFixed(2)}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Pagar R$ {amount.toFixed(2)}
      </Button>
    </Card>
  );
}