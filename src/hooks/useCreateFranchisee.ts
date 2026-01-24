
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
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
}

export function useCreateFranchisee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFranchiseeData) => {
      // Tentar usar Edge Function primeiro
      try {
        console.log('Tentando criar via Edge Function...');
        // Preparar arquivo de logo se fornecido
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
            logoFile
          }
        });

        if (error) {
          throw error;
        }

        return result;
      } catch (err) {
        // Se Edge Function falhar (ex: não deployada), usar método direto
        console.warn('Edge Function indisponível, usando método direto:', err);
        return await createFranchiseeDirect(data);
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
 * Método alternativo: cria franqueado diretamente sem Edge Function
 * Cria usuário (signUp), atribui role e cria loja.
 */
async function createFranchiseeDirect(data: CreateFranchiseeData) {
  // 1. Criar novo cliente Supabase isolado para o cadastro do usuário
  // Isso evita que o login atual (Master) seja substituído
  const tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false, // Importante: não salvar sessão
        detectSessionInUrl: false
      }
    }
  );

  // 2. Criar usuário e senha
  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName
      }
    }
  });

  if (authError) {
    throw new Error('Falha ao criar usuário: ' + authError.message);
  }

  if (!authData.user) {
    throw new Error('Usuário não retornado após cadastro.');
  }

  const userId = authData.user.id;
  const adminUser = (await supabase.auth.getUser()).data.user;

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

  // 5. Criar loja vinculada ao novo usuário
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
      franchisee_user_id: userId,
      created_by: adminUser?.id,
      approved_by: adminUser?.id, // Auto-aprovação pois foi criado pelo Master
      approved_at: new Date().toISOString(),
      status: 'active',
      active: true
    })
    .select()
    .single();

  if (storeError) {
    if (storeError.code === '23505') { // Unique constraint violation
      throw new Error('Já existe uma loja registrada com esta URL (slug).');
    }
    throw new Error('Erro ao criar loja: ' + storeError.message);
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
