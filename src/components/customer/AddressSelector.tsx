import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react';
import { useCustomerAddresses, useDeleteAddress, useSetDefaultAddress } from '@/hooks/useCustomerAddresses';
import AddressFormDialog from './AddressFormDialog';

interface AddressSelectorProps {
  customerId: string;
  selectedAddressId?: string;
  onSelectAddress: (addressId: string) => void;
}

export default function AddressSelector({ 
  customerId, 
  selectedAddressId, 
  onSelectAddress 
}: AddressSelectorProps) {
  const { data: addresses, isLoading } = useCustomerAddresses(customerId);
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  if (isLoading) {
    return <div>Carregando endereços...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Endereço de Entrega</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingAddress(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {addresses && addresses.length > 0 ? (
        <RadioGroup 
          value={selectedAddressId} 
          onValueChange={onSelectAddress}
        >
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {address.street}, {address.number}
                          </p>
                          {address.complement && (
                            <p className="text-sm text-muted-foreground">
                              {address.complement}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {address.neighborhood} - {address.city}, {address.state}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            CEP: {address.zipcode}
                          </p>
                          {address.is_default && (
                            <span className="text-xs text-primary font-medium">
                              Endereço Padrão
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingAddress(address);
                            setIsFormOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm('Deseja remover este endereço?')) {
                              deleteAddress.mutate(address.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Label>
                </div>
                {!address.is_default && (
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-9 mt-2 h-auto p-0 text-xs"
                    onClick={() => setDefault.mutate({ customerId, addressId: address.id })}
                  >
                    Definir como padrão
                  </Button>
                )}
              </div>
            ))}
          </div>
        </RadioGroup>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="mb-4">Você não tem endereços cadastrados</p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Endereço
          </Button>
        </div>
      )}

      <AddressFormDialog
        customerId={customerId}
        address={editingAddress}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </Card>
  );
}
