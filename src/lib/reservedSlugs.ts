// A loja do franqueado é servida na raiz do domínio de delivery
// (ex: delivery.acainograu.com.br/gurupi), via rota `/:slug`.
//
// Isso faz com que o slug dispute o primeiro segmento da URL com todas as
// rotas fixas do app. O React Router prioriza rota estática sobre dinâmica,
// então quem perde é a loja: um franqueado cadastrado com o slug "menu"
// ficaria permanentemente inacessível. Por isso a lista abaixo é bloqueada
// no cadastro (ver FranchiseeForm) e usada para identificar se um caminho
// é de loja ou não (ver CartContext.getStoreAwareRoute).
//
// Ao criar uma nova rota de primeiro nível no App.tsx / DeliveryApp.tsx,
// adicione o segmento aqui também.
export const RESERVED_SLUGS = [
  // Rotas do storefront do cliente
  'auth',
  'cart',
  'checkout',
  'favorites',
  'install',
  'location-city',
  'menu',
  'order-confirmation',
  'order-details',
  'orders',
  'product',
  'profile',
  'searching',
  'store-result',
  'stores',
  'tracking',

  // Rotas administrativas / outros módulos
  'admin',
  'avaliacao',
  'colaborador',
  'delivery',
  'driver',
  'franchise-request',
  'frota',
  'suporte',

  // Pastas estáticas em public/ — o .htaccess só cai no index.html quando o
  // caminho não existe em disco, então esses nomes nunca chegariam na rota
  'assets',
  'experience-nograu',
  'game',
  'hub-preview',
  'sounds',

  // Reservados para uso futuro e infraestrutura
  'api',
  'app',
  'ajuda',
  'blog',
  'cadastro',
  'contato',
  'login',
  'logout',
  'loja',
  'lojas',
  'pedido',
  'pedidos',
  'privacidade',
  'public',
  'signup',
  'sobre',
  'static',
  'termos',
  'www',
] as const;

const RESERVED_SLUG_SET = new Set<string>(RESERVED_SLUGS);

/** `true` se o valor não pode ser usado como slug de loja. */
export function isReservedSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return RESERVED_SLUG_SET.has(slug.trim().toLowerCase());
}
