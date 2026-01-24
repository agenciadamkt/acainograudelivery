import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  useCustomerAddresses, 
  useCreateAddress, 
  useUpdateAddress, 
  useDeleteAddress,
  useSetDefaultAddress 
} from '@/hooks/useCustomerAddresses';
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const addressSchema = z.object({
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipcode: z.string().min(8, 'CEP inválido'),
  complement: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressManagementProps {
  customerId: string;
}

export function AddressManagement({ customerId }: AddressManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [deleteAddress, setDeleteAddress] = useState<string | null>(null);

  const { data: addresses } = useCustomerAddresses(customerId);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipcode: '',
      complement: '',
    },
  });

  const handleSubmit = async (data: AddressFormData) => {
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ id: editingAddress.id, data });
        toast.success('Endereço atualizado!');
      } else {
        await createAddress.mutateAsync({ customer_id: customerId, ...data });
        toast.success('Endereço adicionado!');
      }
      setIsDialogOpen(false);
      setEditingAddress(null);
      form.reset();
    } catch (error) {
      toast.error('Erro ao salvar endereço');
    }
  };

  const handleEdit = (address: any) => {
    setEditingAddress(address);
    form.reset({
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      complement: address.complement || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteAddress) return;
    try {
      await deleteAddressMutation.mutateAsync(deleteAddress);
      toast.success('Endereço excluído!');
      setDeleteAddress(null);
    } catch (error) {
      toast.error('Erro ao excluir endereço');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress.mutateAsync({ customerId, addressId });
      toast.success('Endereço padrão atualizado!');
    } catch (error) {
      toast.error('Erro ao definir endereço padrão');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Meus Endereços</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingAddress(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="zipcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
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
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input placeholder="Apto, casa..." {...field} />
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
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingAddress(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses && addresses.length > 0 ? (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {address.is_default && (
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                  <p className="font-medium">
                    {address.street}, {address.number}
                  </p>
                  {address.complement && (
                    <p className="text-sm text-muted-foreground">{address.complement}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {address.neighborhood} - {address.city}/{address.state}
                  </p>
                  <p className="text-sm text-muted-foreground">CEP: {address.zipcode}</p>
                </div>
                <div className="flex gap-2">
                  {!address.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(address)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteAddress(address.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum endereço cadastrado</p>
        </Card>
      )}

      <AlertDialog open={!!deleteAddress} onOpenChange={(open) => !open && setDeleteAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir endereço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}