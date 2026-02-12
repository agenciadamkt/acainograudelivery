import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeliveryDriver, useDriverStores } from '@/hooks/useDeliveryDrivers';
import { useStores } from '@/hooks/useStores';

const driverSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  vehicle_type: z.string().optional(),
  vehicle_plate: z.string().optional(),
  status: z.enum(['disponivel', 'em_entrega', 'offline']),
  active: z.boolean().default(true),
  is_global: z.boolean().default(false),
  store_id: z.string().optional(),
  allowed_store_ids: z.array(z.string()).default([]),
});

type DriverFormData = z.infer<typeof driverSchema>;

interface DriverFormProps {
  driver?: DeliveryDriver;
  onSubmit: (data: DriverFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DriverForm({ driver, onSubmit, onCancel, isSubmitting }: DriverFormProps) {
  const { data: stores } = useStores();
  const { data: driverStores } = useDriverStores(driver?.id);

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: driver?.name || '',
      phone: driver?.phone || '',
      vehicle_type: driver?.vehicle_type || '',
      vehicle_plate: driver?.vehicle_plate || '',
      status: driver?.status || 'disponivel',
      active: driver?.active ?? true,
      is_global: driver?.is_global || false,
      store_id: driver?.store_id || undefined,
      allowed_store_ids: [],
    },
  });

  // Populate allowed stores when data is loaded
  useEffect(() => {
    if (driverStores && driverStores.length > 0) {
      form.setValue('allowed_store_ids', driverStores);
    }
  }, [driverStores, form]);

  const isGlobal = form.watch('is_global');

  // Filter out stores that are not active
  const activeStores = stores?.filter(s => s.status === 'active') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Entregador</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome completo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(00) 00000-0000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicle_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Veículo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicle_plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ABC-1234" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="em_entrega">Em Entrega</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
          <h3 className="font-medium text-sm text-foreground">Disponibilidade e Acesso</h3>

          <FormField
            control={form.control}
            name="store_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loja Proprietária (Origem)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja origem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} {store.city ? `(${store.city})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Define a qual loja este entregador pertence (proprietária).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_global"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-background">
                <div className="space-y-0.5">
                  <FormLabel className="text-base text-foreground">Acesso Global</FormLabel>
                  <FormDescription>
                    Disponível para TODAS as lojas.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {!isGlobal && (
            <div className="space-y-3">
              <FormLabel>Lojas Permitidas (Secundárias)</FormLabel>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-background">
                <div className="space-y-2">
                  {activeStores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma loja ativa encontrada.</p>
                  ) : (
                    activeStores.map((store) => (
                      <FormField
                        key={store.id}
                        control={form.control}
                        name="allowed_store_ids"
                        render={({ field }) => {
                          const isStoreIdSelected = field.value?.includes(store.id);
                          // Disable checking the store if it is the owner store
                          const isOwner = form.watch('store_id') === store.id;

                          return (
                            <FormItem
                              key={store.id}
                              className="flex flex-row items-start space-x-3 space-y-0 pb-2 border-b last:border-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={isStoreIdSelected || isOwner}
                                  disabled={isOwner} // Owner store is always allowed
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), store.id])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== store.id
                                        )
                                      )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex-1">
                                {store.name}
                                {store.city && <span className="text-xs text-muted-foreground ml-2">({store.city})</span>}
                                {isOwner && <span className="text-xs text-blue-600 font-bold ml-2">(Principal)</span>}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
              <FormDescription>
                Selecione outras lojas que também podem ver este entregador.
              </FormDescription>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Entregador disponível para entregas
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
