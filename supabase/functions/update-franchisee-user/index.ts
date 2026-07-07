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

    const { userId: providedUserId, email, password, fullName, phone, action } = await req.json()

    let userId = providedUserId

    // Se não tiver userId mas tiver e-mail e ação for confirm, buscamos o ID
    if (!userId && email && action === 'confirm') {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      
      const user = users.find(u => u.email === email)
      if (!user) throw new Error('Usuário não encontrado com este e-mail')
      userId = user.id
    }

    if (!userId) {
      throw new Error('ID do usuário ou e-mail (para confirmação) é obrigatório')
    }

    const updates: any = {}
    if (email) updates.email = email
    if (password) updates.password = password
    if (fullName || phone) {
      updates.user_metadata = { 
        ...(fullName && { full_name: fullName }),
        ...(phone && { phone }) 
      }
    }
    
    // Forçar confirmação de e-mail
    updates.email_confirm = true

    // 1. Atualizar/Confirmar usuário via Admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    )

    if (userError) {
      throw new Error('Erro ao atualizar usuário: ' + userError.message)
    }

    // 2. Sincronizar com a tabela de perfis (profiles)
    const profileUpdates: any = {}
    if (email) profileUpdates.email = email
    if (fullName) profileUpdates.full_name = fullName
    if (phone) profileUpdates.phone = phone

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError)
      }
    }

    return new Response(
      JSON.stringify({ user: userData.user }),
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
