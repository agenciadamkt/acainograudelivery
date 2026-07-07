import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { formatBRL } from '@/lib/utils';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  taxa_boleto_unit_applied: number;
  subtotal: number;
  franchisee_products: { name: string; unit: string; code: string | null } | null;
}

interface FranchiseeProduct {
  id: string;
  name: string;
  unit: string;
  code: string | null;
  price: number;
  taxa: number;
}

interface NovoItem {
  tempId: string;
  product: FranchiseeProduct;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  originalSubtotal: number;
  originalAdvertisingFee: number;
  paymentMethod: string;
}

export function EditOrderDialog({ open, onOpenChange, orderId, originalSubtotal, originalAdvertisingFee, paymentMethod }: Props) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [novosItens, setNovosItens] = useState<NovoItem[]>([]);
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState('');
  const [reason, setReason] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['edit_order_items', orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('franchisee_order_items')
        .select('id, product_id, quantity, unit_price, taxa_boleto_unit_applied, subtotal, franchisee_products(name, unit, code)')
        .eq('order_id', orderId);
      if (error) throw error;
      return (data || []) as OrderItem[];
    },
    enabled: open,
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ['edit_order_catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('franchisee_products')
        .select('id, name, unit, code, price, taxa')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as FranchiseeProduct[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && items.length > 0) {
      setQuantities(Object.fromEntries(items.map(i => [i.id, i.quantity])));
    }
    if (!open) {
      setQuantities({});
      setNovosItens([]);
      setProdutoParaAdicionar('');
      setReason('');
    }
  }, [open, items]);

  const idsJaNoPedido = new Set([...items.map(i => i.product_id), ...novosItens.map(n => n.product.id)]);
  const produtosDisponiveis = catalogo.filter(p => !idsJaNoPedido.has(p.id));

  const taxaBoletoPorUnidade = (p: FranchiseeProduct) => (paymentMethod === 'Boleto' ? p.taxa : 0);

  const handleAdicionarProduto = () => {
    const produto = catalogo.find(p => p.id === produtoParaAdicionar);
    if (!produto) return;
    setNovosItens(prev => [...prev, { tempId: crypto.randomUUID(), product: produto, quantity: 1 }]);
    setProdutoParaAdicionar('');
  };

  const handleRemoverNovoItem = (tempId: string) => {
    setNovosItens(prev => prev.filter(n => n.tempId !== tempId));
  };

  // Recalcula os totais com as quantidades editadas + itens novos
  // adicionados, preservando preço unitário e taxa de boleto congelados no
  // momento do pedido original (itens existentes) — só a quantidade muda.
  // A taxa de publicidade é proporcional ao novo subtotal (mesma % efetiva
  // do pedido original), já que não fica guardada por item.
  const recalculo = useMemo(() => {
    const subtotalExistentes = items.reduce((sum, item) => {
      const qty = quantities[item.id] ?? item.quantity;
      return sum + (item.unit_price + item.taxa_boleto_unit_applied) * qty;
    }, 0);
    const feesExistentes = items.reduce((sum, item) => {
      const qty = quantities[item.id] ?? item.quantity;
      return sum + item.taxa_boleto_unit_applied * qty;
    }, 0);
    const subtotalNovos = novosItens.reduce((sum, n) => {
      return sum + (n.product.price + taxaBoletoPorUnidade(n.product)) * n.quantity;
    }, 0);
    const feesNovos = novosItens.reduce((sum, n) => sum + taxaBoletoPorUnidade(n.product) * n.quantity, 0);

    const novoSubtotal = subtotalExistentes + subtotalNovos;
    const novoFeesTotal = feesExistentes + feesNovos;
    const proporcaoPublicidade = originalSubtotal > 0 ? originalAdvertisingFee / originalSubtotal : 0;
    const novaTaxaPublicidade = novoSubtotal * proporcaoPublicidade;
    return {
      subtotal: novoSubtotal,
      feesTotal: novoFeesTotal,
      advertisingFee: novaTaxaPublicidade,
      totalAmount: novoSubtotal + novaTaxaPublicidade,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, quantities, novosItens, originalSubtotal, originalAdvertisingFee, paymentMethod]);

  const houveAlteracao =
    items.some(item => (quantities[item.id] ?? item.quantity) !== item.quantity) || novosItens.length > 0;

  const salvar = useMutation({
    mutationFn: async () => {
      // 1. Atualiza/remove cada item existente alterado
      for (const item of items) {
        const novaQtd = quantities[item.id] ?? item.quantity;
        if (novaQtd === item.quantity) continue;

        if (novaQtd <= 0) {
          const { error } = await supabase.from('franchisee_order_items' as any).delete().eq('id', item.id);
          if (error) throw error;
        } else {
          const novoSubtotalItem = (item.unit_price + item.taxa_boleto_unit_applied) * novaQtd;
          const { error } = await supabase
            .from('franchisee_order_items' as any)
            .update({ quantity: novaQtd, subtotal: novoSubtotalItem })
            .eq('id', item.id);
          if (error) throw error;
        }
      }

      // 2. Insere os itens novos
      if (novosItens.length > 0) {
        const novosRows = novosItens.map(n => ({
          order_id: orderId,
          product_id: n.product.id,
          quantity: n.quantity,
          unit_price: n.product.price,
          taxa_boleto_unit_applied: taxaBoletoPorUnidade(n.product),
          subtotal: (n.product.price + taxaBoletoPorUnidade(n.product)) * n.quantity,
        }));
        const { error } = await supabase.from('franchisee_order_items' as any).insert(novosRows);
        if (error) throw error;
      }

      // 3. Atualiza os totais do pedido + marca como alterado pela franqueadora
      const { error } = await supabase
        .from('franchisee_orders' as any)
        .update({
          subtotal: recalculo.subtotal,
          fees_total: recalculo.feesTotal,
          advertising_fee: recalculo.advertisingFee,
          total_amount: recalculo.totalAmount,
          edited_by_admin: true,
          edit_reason: reason.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin_order_items', orderId] });
      toast.success('Pedido alterado! O franqueado verá o motivo da alteração.');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error('Erro ao salvar alteração: ' + err.message),
  });

  const canSubmit = houveAlteracao && reason.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={v => !salvar.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-purple-600" /> Editar Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-purple-600" /></div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const qty = quantities[item.id] ?? item.quantity;
                const subtotalItem = (item.unit_price + item.taxa_boleto_unit_applied) * qty;
                const removendo = qty <= 0;
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${removendo ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${removendo ? 'line-through text-muted-foreground' : ''}`}>
                        {item.franchisee_products?.name || 'Produto removido'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.franchisee_products?.code ? `${item.franchisee_products.code} · ` : ''}
                        {formatBRL(item.unit_price)} / {item.franchisee_products?.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={e => setQuantities(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="w-16 text-center"
                    />
                    <span className={`text-sm font-bold w-20 text-right ${removendo ? 'text-red-600' : 'text-purple-600'}`}>
                      {removendo ? '—' : formatBRL(subtotalItem)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 shrink-0 ${removendo ? 'text-red-600 bg-red-100' : 'text-muted-foreground hover:text-red-600'}`}
                      onClick={() => setQuantities(prev => ({ ...prev, [item.id]: removendo ? item.quantity : 0 }))}
                      title={removendo ? 'Desfazer remoção' : 'Remover item'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {novosItens.map(n => {
                const subtotalItem = (n.product.price + taxaBoletoPorUnidade(n.product)) * n.quantity;
                return (
                  <div key={n.tempId} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-emerald-800">{n.product.name} <span className="text-[10px] font-bold uppercase">novo</span></p>
                      <p className="text-xs text-emerald-600">
                        {n.product.code ? `${n.product.code} · ` : ''}
                        {formatBRL(n.product.price)} / {n.product.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={n.quantity}
                      onChange={e => setNovosItens(prev => prev.map(it => it.tempId === n.tempId ? { ...it, quantity: Math.max(1, Number(e.target.value)) } : it))}
                      className="w-16 text-center"
                    />
                    <span className="text-sm font-bold w-20 text-right text-emerald-700">{formatBRL(subtotalItem)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                      onClick={() => handleRemoverNovoItem(n.tempId)}
                      title="Remover item novo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Adicionar produto */}
          <div className="flex gap-2 pt-1">
            <Select value={produtoParaAdicionar} onValueChange={setProdutoParaAdicionar}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Adicionar produto ao pedido..." />
              </SelectTrigger>
              <SelectContent>
                {produtosDisponiveis.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto disponível</div>
                ) : (
                  produtosDisponiveis.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatBRL(p.price)}/{p.unit}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={handleAdicionarProduto} disabled={!produtoParaAdicionar} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          {houveAlteracao && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Novo subtotal</span><span className="font-semibold">{formatBRL(recalculo.subtotal)}</span></div>
              {recalculo.advertisingFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Taxa de publicidade</span><span className="font-semibold">{formatBRL(recalculo.advertisingFee)}</span></div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-purple-200">
                <span className="font-bold">Novo total</span>
                <span className="font-black text-purple-700">{formatBRL(recalculo.totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Motivo da alteração <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Ex: Item indisponível no estoque, ajuste de quantidade combinado por telefone..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              O franqueado verá este motivo no detalhe do pedido. Mínimo 5 caracteres.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => salvar.mutate()}
            disabled={!canSubmit || salvar.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Salvar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
