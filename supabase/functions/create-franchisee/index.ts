import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const data = await req.json()

    // 1. Criar usuário via Admin API (não faz login automático)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName
      }
    })

    if (userError) {
      throw new Error('Erro ao criar usuário: ' + userError.message)
    }
    
    if (!userData.user) {
      throw new Error('Usuário não foi criado')
    }

    const userId = userData.user.id

    // 2. Inserir role 'admin' para o novo franqueado
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin'
      })

    if (roleError) {
      throw new Error('Erro ao atribuir role: ' + roleError.message)
    }

    // 3. Fazer upload da logo se fornecida
    let logoUrl = null
    if (data.logoFile) {
      const fileName = `${data.slug}-${Date.now()}.${data.logoFile.ext}`
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('products')
        .upload(fileName, decode(data.logoFile.base64), {
          contentType: data.logoFile.type
        })

      if (uploadError) {
        throw new Error('Erro ao fazer upload da logo: ' + uploadError.message)
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('products')
        .getPublicUrl(fileName)

      logoUrl = publicUrl
    }

    // 4. Criar loja
    const { data: storeData, error: storeError } = await supabaseAdmin
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
        business_hours: data.businessHours,
        preparation_time: data.preparationTime,
        delivery_time: data.deliveryTime,
        accepts_cash: data.acceptsCash,
        accepts_card: data.acceptsCard,
        accepts_pix: data.acceptsPix,
        requires_change: data.requiresChange,
        franchisee_user_id: userId,
        status: 'active',
        active: true
      })
      .select()
      .single()

    if (storeError) {
      throw new Error('Erro ao criar loja: ' + storeError.message)
    }

    return new Response(
      JSON.stringify({ user: userData.user, store: storeData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}
