import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from './ImageUpload';
import { useCreateFranchisee } from '@/hooks/useCreateFranchisee';
import { useUpdateStore, type Store } from '@/hooks/useStores';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const storeSchema = z.object({
  // Loja
  storeName: z.string().trim().min(3, 'Nome da loja deve ter no mínimo 3 caracteres'),
  slug: z.string().trim().min(3, 'Slug deve ter no mínimo 3 caracteres'),
  zipcode: z.string().trim().min(8, 'CEP inválido'),
  street: z.string().trim().min(3, 'Rua é obrigatória'),
  addressNumber: z.string().trim().min(1, 'Número é obrigatório'),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().min(3, 'Bairro é obrigatório'),
  city: z.string().trim().min(3, 'Cidade é obrigatória'),
  state: z.string().trim().length(2, 'Estado deve ter 2 caracteres'),
  storePhone: z.string().trim().min(10, 'Telefone inválido'),

  // Delivery
  deliveryFee: z.number().min(0, 'Taxa deve ser maior ou igual a 0'),
  minOrderValue: z.number().min(0, 'Valor mínimo deve ser maior ou igual a 0'),
  deliveryRadius: z.number().min(1, 'Raio deve ser maior que 0'),
  preparationTime: z.number().min(1, 'Tempo de preparo deve ser maior que 0'),
  deliveryTime: z.number().min(1, 'Tempo de entrega deve ser maior que 0'),

  // Pagamento
  acceptsCash: z.boolean(),
  acceptsCard: z.boolean(),
  acceptsPix: z.boolean(),
  requiresChange: z.boolean(),
});

const userSchema = z.object({
  fullName: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  phone: z.string().trim().min(10, 'Telefone inválido'),
  cpfCnpj: z.string().trim().min(11, 'CPF/CNPJ inválido'),
  password: z.string().trim().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

// Schema para criação (requer tudo)
const createSchema = storeSchema.merge(userSchema);
// Schema para edição (campos de usuário opcionais, pois focamos na loja)
const editSchema = storeSchema.merge(userSchema.partial());

type FranchiseeFormData = z.infer<typeof createSchema>;

interface FranchiseeFormProps {
  onSuccess?: () => void;
  initialData?: Store;
}

const daysOfWeek = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

export function FranchiseeForm({ onSuccess, initialData }: FranchiseeFormProps) {
  const isEditing = !!initialData;
  const [logoFile, setLogoFile] = useState<File>();
  const [logoPreview, setLogoPreview] = useState<string | undefined>(initialData?.logo_url || undefined);

  const [businessHours, setBusinessHours] = useState(
    initialData?.business_hours || {
      monday: { open: '08:00', close: '22:00', closed: false },
      tuesday: { open: '08:00', close: '22:00', closed: false },
      wednesday: { open: '08:00', close: '22:00', closed: false },
      thursday: { open: '08:00', close: '22:00', closed: false },
      friday: { open: '08:00', close: '22:00', closed: false },
      saturday: { open: '08:00', close: '22:00', closed: false },
      sunday: { open: '08:00', close: '22:00', closed: false },
    });

  const createFranchisee = useCreateFranchisee();
  const updateStore = useUpdateStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<FranchiseeFormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      deliveryFee: 0,
      minOrderValue: 0,
      deliveryRadius: 5,
      preparationTime: 30,
      deliveryTime: 40,
      acceptsCash: true,
      acceptsCard: true,
      acceptsPix: true,
      requiresChange: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      // Tentar extrair endereço (Best effort)
      // Formato esperado: "Rua X, 123 - Bairro"
      let street = initialData.address || '';
      let number = '';
      let neighborhood = '';

      if (initialData.address) {
        const parts = initialData.address.split(',');
        if (parts.length > 0) street = parts[0].trim();
        if (parts.length > 1) {
          const numAndNeigh = parts[1].split('-');
          if (numAndNeigh.length > 0) number = numAndNeigh[0].trim();
          if (numAndNeigh.length > 1) neighborhood = numAndNeigh[1].trim();
        }
      }

      reset({
        storeName: initialData.name,
        slug: initialData.slug || '',
        street: street,
        addressNumber: number || 'S/N', // Preencher para evitar validação erro, user corrige
        neighborhood: neighborhood || 'Centro', // Preencher para evitar validação erro
        zipcode: initialData.zipcode || '',
        city: initialData.city || '',
        state: initialData.state || '',
        storePhone: initialData.phone || '',
        deliveryFee: initialData.delivery_fee || 0,
        minOrderValue: initialData.min_order_value || 0,
        deliveryRadius: initialData.delivery_radius_km || 0,
        preparationTime: initialData.preparation_time || 0,
        deliveryTime: initialData.delivery_time || 0,
        // Configs de pagamento não estão na interface Store, mantendo defaults
        acceptsCash: true,
        acceptsCard: true,
        acceptsPix: true,
        requiresChange: false,
      });
      if (initialData.logo_url) setLogoPreview(initialData.logo_url);
      if (initialData.business_hours) setBusinessHours(initialData.business_hours);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FranchiseeFormData) => {
    try {
      if (isEditing && initialData) {
        // Atualizar
        const fullAddress = `${data.street}, ${data.addressNumber}${data.complement ? ' - ' + data.complement : ''} - ${data.neighborhood}`;

        await updateStore.mutateAsync({
          id: initialData.id,
          updates: {
            name: data.storeName,
            slug: data.slug,
            phone: data.storePhone,
            address: fullAddress,
            zipcode: data.zipcode,
            city: data.city,
            state: data.state,
            delivery_fee: data.deliveryFee,
            min_order_value: data.minOrderValue,
            delivery_radius_km: data.deliveryRadius,
            preparation_time: data.preparationTime,
            delivery_time: data.deliveryTime,
            business_hours: businessHours,
            // Se houver upload de nova logo, precisaria tratar upload separado ou no updateStore
            // Por simplicidade, assumimos que logo só se atualiza na criação ou via profile page por enquanto.
            // Para habilitar update de logo, precisariamos fazer upload aqui e passar a URL.
          }
        });
      } else {
        // Criar
        await createFranchisee.mutateAsync({
          fullName: data.fullName!,
          email: data.email!,
          phone: data.phone!,
          cpfCnpj: data.cpfCnpj!,
          password: data.password!,
          storeName: data.storeName,
          slug: data.slug,
          zipcode: data.zipcode,
          street: data.street,
          addressNumber: data.addressNumber,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          storePhone: data.storePhone,
          deliveryFee: data.deliveryFee,
          minOrderValue: data.minOrderValue,
          deliveryRadius: data.deliveryRadius,
          preparationTime: data.preparationTime,
          deliveryTime: data.deliveryTime,
          acceptsCash: data.acceptsCash,
          acceptsCard: data.acceptsCard,
          acceptsPix: data.acceptsPix,
          requiresChange: data.requiresChange,
          businessHours,
          logoFile,
        });
      }
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar franqueado:', error);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    setLogoFile(file);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setLogoPreview(preview);
        resolve(preview);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoRemove = () => {
    setLogoFile(undefined);
    setLogoPreview(undefined);
  };

  const fetchAddressByZipcode = async (zipcode: string) => {
    const cleanZipcode = zipcode.replace(/\D/g, '');
    if (cleanZipcode.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZipcode}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setValue('street', data.logradouro);
        setValue('neighborhood', data.bairro);
        setValue('city', data.localidade);
        setValue('state', data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const isLoading = createFranchisee.isPending || updateStore.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue={isEditing ? "store" : "franchisee"} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {!isEditing && <TabsTrigger value="franchisee">👤 Franqueado</TabsTrigger>}
          <TabsTrigger value="store">🏪 Loja</TabsTrigger>
          <TabsTrigger value="delivery">🚚 Delivery</TabsTrigger>
          <TabsTrigger value="payment">💳 Pagamento</TabsTrigger>
        </TabsList>

        {!isEditing && (
          <TabsContent value="franchisee" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" {...register('phone')} placeholder="(11) 99999-9999" />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                <Input id="cpfCnpj" {...register('cpfCnpj')} />
                {errors.cpfCnpj && (
                  <p className="text-sm text-destructive mt-1">{errors.cpfCnpj.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Senha Temporária *</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="store" className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="storeName">Nome da Loja *</Label>
              <Input id="storeName" {...register('storeName')} />
              {errors.storeName && (
                <p className="text-sm text-destructive mt-1">{errors.storeName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">Slug/URL * (ex: acai-copacabana)</Label>
              <Input id="slug" {...register('slug')} />
              {errors.slug && (
                <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="zipcode">CEP *</Label>
              <Input
                id="zipcode"
                {...register('zipcode')}
                onBlur={(e) => fetchAddressByZipcode(e.target.value)}
                placeholder="00000-000"
              />
              {errors.zipcode && (
                <p className="text-sm text-destructive mt-1">{errors.zipcode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="street">Rua *</Label>
              <Input id="street" {...register('street')} />
              {errors.street && (
                <p className="text-sm text-destructive mt-1">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addressNumber">Número *</Label>
                <Input id="addressNumber" {...register('addressNumber')} />
                {errors.addressNumber && (
                  <p className="text-sm text-destructive mt-1">{errors.addressNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" {...register('complement')} />
              </div>
            </div>

            <div>
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input id="neighborhood" {...register('neighborhood')} />
              {errors.neighborhood && (
                <p className="text-sm text-destructive mt-1">{errors.neighborhood.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input id="city" {...register('city')} />
                {errors.city && (
                  <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">Estado * (UF)</Label>
                <Input id="state" {...register('state')} maxLength={2} placeholder="SP" />
                {errors.state && (
                  <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="storePhone">Telefone da Loja *</Label>
              <Input id="storePhone" {...register('storePhone')} placeholder="(11) 3333-3333" />
              {errors.storePhone && (
                <p className="text-sm text-destructive mt-1">{errors.storePhone.message}</p>
              )}
            </div>

            {!isEditing && (
              <div>
                <Label>Logo da Loja</Label>
                <ImageUpload
                  currentImageUrl={logoPreview}
                  onUpload={handleLogoUpload}
                  onRemove={handleLogoRemove}
                  isUploading={false}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deliveryFee">Taxa de Entrega (R$) *</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  step="0.01"
                  {...register('deliveryFee', { valueAsNumber: true })}
                />
                {errors.deliveryFee && (
                  <p className="text-sm text-destructive mt-1">{errors.deliveryFee.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="minOrderValue">Pedido Mínimo (R$) *</Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  step="0.01"
                  {...register('minOrderValue', { valueAsNumber: true })}
                />
                {errors.minOrderValue && (
                  <p className="text-sm text-destructive mt-1">{errors.minOrderValue.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryRadius">Raio de Entrega (km) *</Label>
                <Input
                  id="deliveryRadius"
                  type="number"
                  {...register('deliveryRadius', { valueAsNumber: true })}
                />
                {errors.deliveryRadius && (
                  <p className="text-sm text-destructive mt-1">{errors.deliveryRadius.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preparationTime">Tempo de Preparo (min) *</Label>
                <Input
                  id="preparationTime"
                  type="number"
                  {...register('preparationTime', { valueAsNumber: true })}
                />
                {errors.preparationTime && (
                  <p className="text-sm text-destructive mt-1">{errors.preparationTime.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryTime">Tempo de Entrega (min) *</Label>
                <Input
                  id="deliveryTime"
                  type="number"
                  {...register('deliveryTime', { valueAsNumber: true })}
                />
                {errors.deliveryTime && (
                  <p className="text-sm text-destructive mt-1">{errors.deliveryTime.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-4 block">Horários de Funcionamento</Label>
              <div className="space-y-3">
                {daysOfWeek.map((day) => (
                  <div key={day.key} className="flex items-center gap-4">
                    <div className="w-24">
                      <Label>{day.label}</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={businessHours[day.key].open}
                        onChange={(e) =>
                          setBusinessHours({
                            ...businessHours,
                            [day.key]: { ...businessHours[day.key], open: e.target.value },
                          })
                        }
                        disabled={businessHours[day.key].closed}
                        className="w-32"
                      />
                      <span>às</span>
                      <Input
                        type="time"
                        value={businessHours[day.key].close}
                        onChange={(e) =>
                          setBusinessHours({
                            ...businessHours,
                            [day.key]: { ...businessHours[day.key], close: e.target.value },
                          })
                        }
                        disabled={businessHours[day.key].closed}
                        className="w-32"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={businessHours[day.key].closed}
                        onCheckedChange={(checked) =>
                          setBusinessHours({
                            ...businessHours,
                            [day.key]: { ...businessHours[day.key], closed: checked },
                          })
                        }
                      />
                      <Label>Fechado</Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="space-y-4">
            <Label>Métodos de Pagamento Aceitos</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptsCash"
                checked={watch('acceptsCash')}
                onCheckedChange={(checked) => setValue('acceptsCash', checked as boolean)}
              />
              <Label htmlFor="acceptsCash">Dinheiro</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptsCard"
                checked={watch('acceptsCard')}
                onCheckedChange={(checked) => setValue('acceptsCard', checked as boolean)}
              />
              <Label htmlFor="acceptsCard">Cartão</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptsPix"
                checked={watch('acceptsPix')}
                onCheckedChange={(checked) => setValue('acceptsPix', checked as boolean)}
              />
              <Label htmlFor="acceptsPix">PIX</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresChange"
                checked={watch('requiresChange')}
                onCheckedChange={(checked) => setValue('requiresChange', checked as boolean)}
              />
              <Label htmlFor="requiresChange">Precisa informar troco no delivery</Label>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Atualizar Loja' : 'Criar Franqueado'}
        </Button>
      </div>
    </form>
  );
}
