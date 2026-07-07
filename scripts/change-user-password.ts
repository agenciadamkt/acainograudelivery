
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega as variáveis do .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const TARGET_EMAIL = 'acainograupicos@gmail.com';
const NEW_PASSWORD = 'nograu@2026';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ ERRO: Faltam credenciais administrativas.');
  console.error('Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_ROLE_KEY estão no seu arquivo .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function changePassword() {
  console.log(`\n🚀 Iniciando alteração de senha para: ${TARGET_EMAIL}...`);

  try {
    // 1. Buscar o usuário pelo e-mail usando a Admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Erro ao listar usuários: ${listError.message}`);
    }

    const user = users.find(u => u.email === TARGET_EMAIL);

    if (!user) {
      console.error(`\n❌ Erro: Usuário com o e-mail ${TARGET_EMAIL} não encontrado.`);
      return;
    }

    console.log(`✅ Usuário encontrado! ID: ${user.id}`);

    // 2. Atualizar a senha via Admin API (ignora necessidade da senha antiga)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: NEW_PASSWORD }
    );

    if (updateError) {
      throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
    }

    console.log(`\n✨ SUCESSO! A senha de ${TARGET_EMAIL} foi alterada para: ${NEW_PASSWORD}\n`);

  } catch (err: any) {
    console.error(`\n❌ FALHA NO PROCESSO: ${err.message}\n`);
  }
}

changePassword();
