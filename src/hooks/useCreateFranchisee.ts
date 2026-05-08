
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

interface CreateFranchiseeData {
  // Dados do Franqueado
  fullName: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  password: string;

  // Dados da Loja
  storeName: string;
  slug: string;
  zipcode: string;
  street: string;
  addressNumber: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  storePhone: string;
  logoFile?: File;

  // Configurações de Delivery
  deliveryFee: number;
  minOrderValue: number;
  deliveryRadius: number;
  businessHours: BusinessHours;
  preparationTime: number;
  deliveryTime: number;

  // Configurações de Pagamento
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsPix: boolean;
  requiresChange: boolean;
  distribution_center_id?: string | null;
}

export function useCreateFranchisee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFranchiseeData) => {
      // Tentar Edge Function primeiro; se falhar, usar método direto
      try {
        let logoFile = null;
        if (data.logoFile) {
          const base64 = await fileToBase64(data.logoFile);
          logoFile = {
            base64: base64.split(',')[1],
            type: data.logoFile.type,
            ext: data.logoFile.name.split('.').pop()
          };
        }

        const { data: result, error } = await supabase.functions.invoke('create-franchisee', {
          body: {
            fullName: data.fullName,
            email: data.email,
            password: data.password,
            storeName: data.storeName,
            slug: data.slug,
            street: data.street,
            addressNumber: data.addressNumber,
            complement: data.complement,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zipcode: data.zipcode,
            storePhone: data.storePhone,
            deliveryFee: data.deliveryFee,
            minOrderValue: data.minOrderValue,
            deliveryRadius: data.deliveryRadius,
            businessHours: data.businessHours,
            preparationTime: data.preparationTime,
            deliveryTime: data.deliveryTime,
            acceptsCash: data.acceptsCash,
            acceptsCard: data.acceptsCard,
            acceptsPix: data.acceptsPix,
            requiresChange: data.requiresChange,
            distribution_center_id: data.distribution_center_id,
            logoFile
          }
        });

        if (error) throw error;
        return result;
      } catch (edgeFnErr) {
        console.warn('Edge Function indisponível, usando método direto:', edgeFnErr);
        return createFranchiseeDirect(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['franchisee-requests'] });
      toast.success('Franqueado criado com sucesso!', {
        description: 'Se a confirmação de e-mail estiver ativada, peça para o franqueado verificar a caixa de entrada.'
      });
    },
    onError: (error: Error) => {
      console.error('Erro:', error);
      toast.error('Erro ao criar franqueado: ' + error.message);
    },
  });
}

/**
 * Método direto: cria franqueado sem Edge Function.
 * Usa RPC SECURITY DEFINER para criar o usuário direto em auth.users
 * com e-mail já confirmado, evitando FK inválida e bloqueio de login.
 */
async function createFranchiseeDirect(data: CreateFranchiseeData) {
  const adminUser = (await supabase.auth.getUser()).data.user;

  // 1. Criar usuário via função SQL SECURITY DEFINER (insere direto em auth.users)
  const { data: userId, error: rpcError } = await (supabase as any).rpc(
    'create_auth_user_for_franchisee',
    { p_email: data.email, p_password: data.password, p_name: data.fullName }
  );

  if (rpcError) {
    throw new Error('Falha ao criar usuário: ' + rpcError.message);
  }

  if (!userId) {
    throw new Error('Usuário não foi criado. O e-mail pode já estar em uso.');
  }

  // 3. Atribuir role 'admin' (usando o cliente admin principal)
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'admin'
    });

  if (roleError) {
    console.error('Erro ao atribuir role:', roleError);
    // Não bloquear fluxo, mas logar erro
  }

  // 4. Upload da logo se fornecida
  let logoUrl = null;
  if (data.logoFile) {
    const fileExt = data.logoFile.name.split('.').pop() || 'jpg';
    const fileName = `${data.slug}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, data.logoFile, {
        contentType: data.logoFile.type
      });

    if (uploadError) {
      console.error('Erro no upload da logo:', uploadError);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);
      logoUrl = publicUrl;
    }
  }

  // 5. Criar loja — franchisee_user_id null inicialmente para evitar FK
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .insert({
      name: data.storeName,
      slug: data.slug,
      address: data.street,
      address_number: data.addressNumber,
      address_complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      zipcode: data.zipcode,
      phone: data.storePhone,
      logo_url: logoUrl,
      delivery_fee: data.deliveryFee,
      min_order_value: data.minOrderValue,
      delivery_radius_km: data.deliveryRadius,
      business_hours: data.businessHours as any,
      preparation_time: data.preparationTime,
      delivery_time: data.deliveryTime,
      accepts_cash: data.acceptsCash,
      accepts_card: data.acceptsCard,
      accepts_pix: data.acceptsPix,
      requires_change: data.requiresChange,
      distribution_center_id: data.distribution_center_id,
      franchisee_user_id: null,
      created_by: adminUser?.id,
      approved_by: adminUser?.id,
      approved_at: new Date().toISOString(),
      status: 'active',
      active: true
    } as any)
    .select()
    .single();

  if (storeError) {
    if (storeError.code === '23505') {
      throw new Error('Já existe uma loja registrada com esta URL (slug).');
    }
    throw new Error('Erro ao criar loja: ' + storeError.message);
  }

  // 5b. Vincular o usuário à loja via UPDATE (FK só é checada aqui)
  if (storeData?.id && userId) {
    const { error: linkError } = await supabase
      .from('stores')
      .update({ franchisee_user_id: userId } as any)
      .eq('id', storeData.id);

    if (linkError) {
      // Usuário pode não ter sido criado de fato (email já existia / confirmação pendente)
      // A loja já foi criada — link pode ser feito manualmente depois
      console.warn('Não foi possível vincular o usuário à loja:', linkError.message);
    }
  }

  // 6. Criar registro de solicitação (apenas para histórico)
  // Remover campos que não existem na tabela segundo o Lint
  const { error: requestError } = await supabase
    .from('franchisee_requests')
    .insert({
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      // cpf_cnpj não existe na tabela franchisee_requests
      store_name: data.storeName,
      preferred_slug: data.slug, // store_slug -> preferred_slug
      city: data.city,
      state: data.state,
      status: 'approved',
      // store_id não existe na tabela
    } as any);

  if (requestError) {
    console.error('Erro ao criar registro de solicitação:', requestError);
  }

  return { user: authData.user, store: storeData };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
