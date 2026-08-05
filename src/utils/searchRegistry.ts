import { MODULE_MENUS } from '@/config/adminModules';

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  url: string;
  icon?: any;
  payload?: any;
}

export interface SearchProvider {
  id: string;
  name: string;
  search: (query: string) => SearchResult[] | Promise<SearchResult[]>;
}

export class SearchRegistry {
  private static providers: SearchProvider[] = [];
  private static initialized = false;

  /**
   * Registra um novo provedor de busca dinamicamente.
   */
  static registerProvider(provider: SearchProvider) {
    if (this.providers.some(p => p.id === provider.id)) return;
    this.providers.push(provider);
  }

  /**
   * Obtém a lista de provedores registrados.
   */
  static getProviders(): SearchProvider[] {
    this.ensureInitialized();
    return this.providers;
  }

  /**
   * Dispara a busca em todos os provedores em paralelo.
   */
  static async search(query: string): Promise<SearchResult[]> {
    this.ensureInitialized();
    
    const searchPromises = this.providers.map(async provider => {
      try {
        return await provider.search(query);
      } catch (err) {
        console.error(`[SearchRegistry] Erro no provedor "${provider.id}":`, err);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  /**
   * Garante que os provedores padrão estão registrados.
   */
  private static ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    // Registra o provedor padrão de Módulos (Menu do GrauOS)
    this.registerProvider({
      id: 'modules',
      name: 'Módulos e Módulos do Sistema',
      search: (query: string) => {
        const q = query.toLowerCase().trim();
        const results: SearchResult[] = [];
        const seen = new Set<string>();

        for (const sections of Object.values(MODULE_MENUS)) {
          for (const section of sections) {
            for (const item of section.items) {
              if (seen.has(item.url)) continue;

              const titleMatch = item.title.toLowerCase().includes(q);
              const sectionMatch = section.label.toLowerCase().includes(q);

              if (titleMatch || sectionMatch || q === '') {
                seen.add(item.url);
                results.push({
                  id: `module-${item.url}`,
                  title: item.title,
                  category: `${section.label.replace(/[🔥📋📦💰🛠️🤝📅🏆🤖💬🎯🚚]/g, '').trim()}`,
                  url: item.url,
                  icon: item.icon
                });
              }
            }
          }
        }
        return results;
      }
    });
  }
}
