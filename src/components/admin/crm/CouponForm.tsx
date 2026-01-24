import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Coupon } from '@/hooks/useCoupons';

const couponSchema = z.object({
  code: z.string().min(3, 'Código deve ter no mínimo 3 caracteres').toUpperCase(),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  min_order_value: z.coerce.number().optional(),
  max_discount: z.coerce.number().optional(),
  usage_limit: z.coerce.number().optional(),
  valid_from: z.date(),
  valid_until: z.date(),
  active: z.boolean().default(true),
});

type CouponFormData = z.infer<typeof couponSchema>;

interface CouponFormProps {
  coupon?: Coupon;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CouponForm({ coupon, onSubmit, onCancel, isSubmitting }: CouponFormProps) {
  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: coupon?.code || '',
      description: coupon?.description || '',
      discount_type: coupon?.discount_type || 'percentage',
      discount_value: coupon?.discount_value || 0,
      min_order_value: coupon?.min_order_value || undefined,
      max_discount: coupon?.max_discount || undefined,
      usage_limit: coupon?.usage_limit || undefined,
      valid_from: coupon?.valid_from ? new Date(coupon.valid_from) : new Date(),
      valid_until: coupon?.valid_until ? new Date(coupon.valid_until) : new Date(),
      active: coupon?.active ?? true,
    },
  });

  const discountType = form.watch('discount_type');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código do Cupom</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Ex: PRIMEIRACOMPRA" 
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Descrição do cupom..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discount_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Desconto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Desconto</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    placeholder={discountType === 'percentage' ? '0 - 100' : '0.00'} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_order_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pedido Mínimo (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="Opcional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desconto Máximo (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="Opcional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="usage_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite de Uso</FormLabel>
              <FormControl>
                <Input type="number" {...field} placeholder="Ilimitado se vazio" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valid_from"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Válido De</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Válido Até</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Cupom disponível para uso
                </div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
