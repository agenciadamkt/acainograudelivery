import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateAddress, useUpdateAddress } from '@/hooks/useCustomerAddresses';

const addressSchema = z.object({
  zipcode: z.string().min(8, 'CEP inválido').max(9),
  street: z.string().min(3, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(3, 'Bairro é obrigatório'),
  city: z.string().min(3, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 letras'),
  is_default: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormDialogProps {
  customerId: string;
  address?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddressFormDialog({
  customerId,
  address,
  open,
  onOpenChange,
}: AddressFormDialogProps) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      zipcode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      is_default: false,
    },
  });

  useEffect(() => {
    if (address) {
      form.reset(address);
    } else {
      form.reset({
        zipcode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        is_default: false,
      });
    }
  }, [address, open]);

  const handleSubmit = async (data: AddressFormData) => {
    try {
      if (address) {
        await updateAddress.mutateAsync({ id: address.id, ...data });
      } else {
        await createAddress.mutateAsync({
          customer_id: customerId,
          ...data,
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    }
  };

  const handleZipcodeBlur = async () => {
    const zipcode = form.getValues('zipcode').replace(/\D/g, '');
    
    if (zipcode.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipcode}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue('street', data.logradouro);
        form.setValue('neighborhood', data.bairro);
        form.setValue('city', data.localidade);
        form.setValue('state', data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {address ? 'Editar Endereço' : 'Novo Endereço'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="zipcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="00000-000"
                      maxLength={9}
                      onBlur={handleZipcodeBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rua *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da rua" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Apto, Bloco..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do bairro" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Cidade *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome da cidade" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="SP"
                        maxLength={2}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">
                    Definir como endereço padrão
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createAddress.isPending || updateAddress.isPending}
              >
                {createAddress.isPending || updateAddress.isPending
                  ? 'Salvando...'
                  : address
                  ? 'Atualizar'
                  : 'Adicionar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
