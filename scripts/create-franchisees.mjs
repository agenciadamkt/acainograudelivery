import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sixzfcpdjtnftacuwvph.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];
const DEFAULT_PASSWORD = 'acainograu2026';

if (!SERVICE_ROLE_KEY) {
  console.error('Uso: node scripts/create-franchisees.mjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const franchisees = [
  { storeName: 'Açaí no Grau - Barra Grande', slug: 'barragrande', email: 'barragrande@acainograu.com.br', fullName: 'Marcia Nielle', phone: '86999032866', city: 'Cajueiro da Praia', state: 'PI', address: 'R-10 Pontal da Barra, Bairro Barra Grande' },
  { storeName: 'Açaí no Grau - Rio Poty', slug: 'riopoty', email: 'riopoty@acainograu.com.br', fullName: 'Samia', phone: '89999056768', city: 'Teresina', state: 'PI', address: 'Av. Marechal Castelo Branco, Loja 310' },
  { storeName: 'Açaí no Grau - Promorar', slug: 'promorar', email: 'promorar@acainograu.com.br', fullName: 'Mariana Vasconcelos', phone: '99992064282', city: 'Teresina', state: 'PI', address: 'Q. Raimundo Portela, 13 a 16' },
  { storeName: 'Açaí no Grau - Teresina Shopping', slug: 'teresinashopping', email: 'teresinashopping@acainograu.com.br', fullName: 'Luana', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Riverside Shopping', slug: 'riversideshopping', email: 'riversideshopping@acainograu.com.br', fullName: 'Luana', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Jockey', slug: 'jockey', email: 'jockey@acainograu.com.br', fullName: 'Alissandra', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Fátima', slug: 'fatima', email: 'fatima@acainograu.com.br', fullName: 'Dynnara Siqueira', phone: null, city: 'Campo Maior', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Barras', slug: 'barras', email: 'barras@acainograu.com.br', fullName: 'Dynnara Siqueira', phone: null, city: 'Barras', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Centro', slug: 'noelia', email: 'noelia@acainograu.com.br', fullName: 'Noelia Lages', phone: null, city: 'Campo Maior', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Homero', slug: 'homero', email: 'homero@acainograu.com.br', fullName: 'Kallen', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Mocambinho', slug: 'mocambinho', email: 'mocabinho@acainograu.com.br', fullName: 'Willamer Texeira', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Cristo Rei', slug: 'cristorei', email: 'cristorei@acainograu.com.br', fullName: 'Felipe Reis', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Dom Severino', slug: 'domseverino', email: 'domseverino@acainograu.com.br', fullName: 'Juliana Reis', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Leste', slug: 'leste', email: 'leste@acainograu.com.br', fullName: 'Ana Paula', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Dirceu', slug: 'dirceu', email: 'dirceu@acainograu.com.br', fullName: 'Dirceu', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - São Cristóvão', slug: 'saocristovao', email: 'saocristovao@acainograu.com.br', fullName: 'São Cristóvão', phone: null, city: 'Teresina', state: 'PI', address: null },
  { storeName: 'Açaí no Grau - Jaime Rios', slug: 'jaimerios', email: 'jaimerios@acainograu.com.br', fullName: 'Maria', phone: '86998342223', city: 'Timon', state: 'MA', address: 'Av. Jaime Rios, 457, Centro' },
  { storeName: 'Açaí no Grau - Cocais Shopping', slug: 'cocais', email: 'cocais@acainograu.com.br', fullName: 'Cocais Shopping', phone: null, city: 'Timon', state: 'MA', address: null },
];

async function createFranchisee(f) {
  process.stdout.write(`Criando: ${f.storeName}... `);

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: f.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: f.fullName }
  });

  if (userError) {
    if (userError.message.toLowerCase().includes('already') || userError.message.toLowerCase().includes('registered')) {
      console.log(`JÁ EXISTE`);
      return;
    }
    console.log(`ERRO AUTH: ${userError.message}`);
    return;
  }

  const userId = userData.user.id;

  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'franchisee_master' });

  if (roleError) {
    console.log(`ERRO ROLE: ${roleError.message}`);
    return;
  }

  const { error: storeError } = await supabase.from('stores').insert({
    name: f.storeName,
    slug: f.slug,
    address: f.address,
    city: f.city,
    state: f.state,
    phone: f.phone,
    franchisee_user_id: userId,
    status: 'active',
    active: true
  });

  if (storeError) {
    console.log(`ERRO STORE: ${storeError.message}`);
    return;
  }

  console.log(`OK (${userId})`);
}

let ok = 0, err = 0;
for (const f of franchisees) {
  try {
    await createFranchisee(f);
    ok++;
  } catch (e) {
    console.log(`FALHA: ${e.message}`);
    err++;
  }
}
console.log(`\nConcluído: ${ok} criados, ${err} erros.`);
