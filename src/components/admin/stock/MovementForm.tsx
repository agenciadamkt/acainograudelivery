'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, ArrowUpCircle, ArrowDownCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InventoryItemForm } from './InventoryItemForm';
import { toast } from 'sonner';

interface MovementLine {
  item_id: string;
  qty: number;
  unit_price: number;
}

interface MovementFormProps {
  onSuccess?: () => void;
}

const emptyLine = (): MovementLine => ({ item_id: '', qty: 0, unit_price: 0 });

export function MovementForm({ onSuccess }: MovementFormProps) {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);

  const [action, setAction] = useState<'entry' | 'exit'>('entry');
  const [classification, setClassification] = useState('purchase');
  const [notes, setNotes] = useState('');
  const [movedAt, setMovedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<MovementLine[]>([emptyLine()]);
  const [openCombo, setOpenCombo] = useState<number | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory_items_compact', currentStore?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('inventory_items')
        .select('id, name, unit, last_price, avg_price')
        .eq('store_id', currentStore?.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  const updateLine = (index: number, field: keyof MovementLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleActionChange = (newAction: 'entry' | 'exit') => {
    setAction(newAction);
    setClassification(newAction === 'entry' ? 'purchase' : 'waste');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id) return;

    const validLines = lines.filter(l => l.item_id && l.qty > 0);
    if (validLines.length === 0) {
      toast.error('Adicione ao menos um insumo com quantidade válida');
      return;
    }

    setIsLoading(true);
    try {
      for (const line of validLines) {
        const { data: item, error: itemError } = await (supabase as any)
          .from('inventory_items')
          .select('current_qty, avg_price, last_price')
          .eq('id', line.item_id)
          .single();

        if (itemError) throw itemError;

        const totalValue = line.qty * line.unit_price;
        const newQty = action === 'entry'
          ? item.current_qty + line.qty
          : item.current_qty - line.qty;

        let newAvgPrice = item.avg_price;
        if (action === 'entry' && newQty > 0) {
          const currentTotalValue = item.current_qty * item.avg_price;
          newAvgPrice = (currentTotalValue + totalValue) / newQty;
        }

        const { error: moveError } = await (supabase as any)
          .from('inventory_movements')
          .insert([{
            store_id: currentStore.id,
            item_id: line.item_id,
            user_id: user?.id,
            action,
            classification,
            qty: line.qty,
            unit_price: line.unit_price,
            total_value: totalValue,
            notes,
            moved_at: `${movedAt}T12:00:00`
          }]);

        if (moveError) throw moveError;

        const { error: updateError } = await (supabase as any)
          .from('inventory_items')
          .update({
            current_qty: newQty,
            avg_price: newAvgPrice,
            last_price: action === 'entry' ? line.unit_price : item.last_price
          })
          .eq('id', line.item_id);

        if (updateError) throw updateError;
      }

      toast.success(`${validLines.length} item(ns) registrado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock_dashboard'] });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error('Erro ao registrar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalGeral = lines.reduce((sum, l) => sum + (l.qty * l.unit_price), 0);
  const validCount = lines.filter(l => l.item_id && l.qty > 0).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      {/* Campos globais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Ação</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={action === 'entry' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => handleActionChange('entry')}
            >
              <ArrowUpCircle size={16} /> Entrada
            </Button>
            <Button
              type="button"
              variant={action === 'exit' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => handleActionChange('exit')}
            >
              <ArrowDownCircle size={16} /> Saída
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Classificação</Label>
          <Select value={classification} onValueChange={setClassification}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {action === 'entry' ? (
                <>
                  <SelectItem value="purchase">Compra / NF</SelectItem>
                  <SelectItem value="adjustment">Ajuste de Estoque (+)</SelectItem>
                  <SelectItem value="initial">Saldo Inicial</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="sale">Venda (Baixa Técnica)</SelectItem>
                  <SelectItem value="waste">Desperdício / Perda</SelectItem>
                  <SelectItem value="consumption">Consumo Interno</SelectItem>
                  <SelectItem value="adjustment">Ajuste de Estoque (-)</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Data da Movimentação</Label>
          <Input
            type="date"
            value={movedAt}
            onChange={(e) => setMovedAt(e.target.value)}
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Observações / Número da NF</Label>
          <Textarea
            placeholder="Ex: Nota Fiscal #123..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-muted/50 resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Linhas de itens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold">Itens da Nota</Label>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-primary font-bold text-xs gap-1"
            onClick={() => setIsNewItemOpen(true)}
          >
            <Plus size={14} /> Novo Insumo
          </Button>
        </div>

        <div className="space-y-2">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1fr_90px_110px_36px] gap-2 px-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Insumo</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Qtd</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Custo Unit. (R$)</p>
            <span />
          </div>

          {lines.map((line, index) => {
            const selectedItem = (items as any[]).find((i: any) => i.id === line.item_id);
            return (
              <div key={index} className="grid grid-cols-[1fr_90px_110px_36px] gap-2 items-center">
                <Popover
                  open={openCombo === index}
                  onOpenChange={(open) => setOpenCombo(open ? index : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-muted/50 border-input font-normal truncate"
                    >
                      <span className="truncate">
                        {line.item_id
                          ? (items as any[]).find((i: any) => i.id === line.item_id)?.name
                          : 'Buscar insumo...'}
                      </span>
                      <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar pelo nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhum insumo encontrado.</CommandEmpty>
                        <CommandGroup>
                          {(items as any[]).map((item: any) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                updateLine(index, 'item_id', item.id);
                                const price = item.last_price || item.avg_price || 0;
                                if (price > 0) updateLine(index, 'unit_price', price);
                                setOpenCombo(null);
                              }}
                            >
                              <Check
                                size={14}
                                className={cn('mr-2 shrink-0', line.item_id === item.id ? 'opacity-100' : 'opacity-0')}
                              />
                              {item.name}
                              <span className="ml-auto text-[10px] text-muted-foreground">{item.unit}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={selectedItem?.unit || '0'}
                  value={line.qty || ''}
                  onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value) || 0)}
                  className="bg-muted/50"
                />

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={line.unit_price || ''}
                  onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="bg-muted/50"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary"
          onClick={addLine}
        >
          <Plus size={15} /> Adicionar Item
        </Button>
      </div>

      {/* Total */}
      {totalGeral > 0 && (
        <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/50">
          <span className="text-sm font-bold text-muted-foreground">Total da Nota</span>
          <span className="text-lg font-black text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
          </span>
        </div>
      )}

      <Button type="submit" className="w-full text-lg font-bold gap-2" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
        Confirmar {validCount > 1 ? `${validCount} Itens` : 'Movimentação'}
      </Button>

      <Dialog open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
        <DialogContent className="sm:max-w-[600px] glass-card border-none">
          <DialogHeader>
            <DialogTitle>Novo Insumo / Produto de Estoque</DialogTitle>
          </DialogHeader>
          <InventoryItemForm onSuccess={() => {
            setIsNewItemOpen(false);
            queryClient.invalidateQueries({ queryKey: ['inventory_items_compact'] });
          }} />
        </DialogContent>
      </Dialog>
    </form>
  );
}
