const DELIVERY_ORIGIN = 'https://delivery.acainograu.com.br';

/**
 * URL pública da loja do franqueado — o link que o admin exibe e copia.
 *
 * Precisa apontar sempre para o domínio de delivery: esta função é usada no
 * painel admin, que roda em app.acainograu.com.br, onde as rotas de loja nem
 * chegam a ser registradas (ver o bloco isAppDomain em App.tsx). Em
 * desenvolvimento usa a própria origem, onde ambos os conjuntos de rotas
 * convivem (isLocal).
 */
export function storefrontUrl(slug: string): string {
  const isLocal =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  const origin = isLocal ? window.location.origin : DELIVERY_ORIGIN;
  return `${origin}/${slug}`;
}
