import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Store {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  delivery_fee: number | null;
  min_order_value: number | null;
  delivery_radius_km: number | null;
  franchisee_user_id: string | null;
  active: boolean;
  banner_url: string | null;
  delivery_time: string | null;
  mercadopago_public_key: string | null;
  // mercadopago_access_token é chave secreta — nunca carregada no cliente
  business_hours: any;
  zip_code: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  cnpj: string | null;
  razao_social: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  regime_tributario: number | null;
  codigo_municipio_ibge: string | null;
}

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  switchStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
  canManageStore: (storeId: string) => boolean;
  toggleStoreStatus: (isOpen: boolean) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStores = async () => {
    if (!user) {
      setStores([]);
      setCurrentStore(null);
      setIsLoading(false);
      return;
    }

    try {
      let storesData: Store[] = [];

      if (userRole?.includes('franchisee_master')) {
        // Master vê todas as lojas — access_token excluído intencionalmente (chave secreta)
        const { data, error } = await supabase.from('stores')
          .select('id, name, slug, status, city, state, address, phone, logo_url, delivery_fee, min_order_value, delivery_radius_km, franchisee_user_id, active, banner_url, delivery_time, mercadopago_public_key, business_hours, zip_code, neighborhood, latitude, longitude, cnpj, razao_social, inscricao_estadual, inscricao_municipal, instagram, facebook, website, regime_tributario, codigo_municipio_ibge')
          .order('name');
        if (error) throw error;
        storesData = (data as unknown as Store[]) || [];
      } else {
        const STORE_COLS = 'id, name, slug, status, city, state, address, phone, logo_url, delivery_fee, min_order_value, delivery_radius_km, franchisee_user_id, active, banner_url, delivery_time, mercadopago_public_key, business_hours, zip_code, neighborhood, latitude, longitude, cnpj, razao_social, inscricao_estadual, inscricao_municipal, instagram, facebook, website, regime_tributario, codigo_municipio_ibge';

        // 1. Lojas vinculadas pelo franchisee_user_id legado
        const { data: legacyStores } = await supabase
          .from('stores')
          .select(STORE_COLS)
          .eq('franchisee_user_id', user.id);

        // 2. Lojas vinculadas via user_unidades (novo sistema RBAC)
        const { data: unitLinks } = await (supabase as any)
          .from('user_unidades')
          .select('store_id')
          .eq('usuario_id', user.id);

        const linkedStoreIds = (unitLinks || []).map((u: any) => u.store_id as string);

        let rbacStores: Store[] = [];
        if (linkedStoreIds.length > 0) {
          const { data: rbacData } = await supabase
            .from('stores')
            .select(STORE_COLS)
            .in('id', linkedStoreIds);
          rbacStores = (rbacData as unknown as Store[]) || [];
        }

        // Merge sem duplicatas
        const allStores = [...(legacyStores as unknown as Store[] || []), ...rbacStores];
        const seen = new Set<string>();
        storesData = allStores.filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        storesData.sort((a, b) => a.name.localeCompare(b.name));
      }

      setStores(storesData);

      // Set current store from localStorage or first available store
      const savedStoreId = localStorage.getItem('currentStoreId');
      if (savedStoreId && storesData.find(s => s.id === savedStoreId)) {
        setCurrentStore(storesData.find(s => s.id === savedStoreId) || null);
      } else if (storesData.length > 0) {
        setCurrentStore(storesData[0]);
        localStorage.setItem('currentStoreId', storesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Erro ao carregar lojas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [user, userRole]);

  const switchStore = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setCurrentStore(store);
      localStorage.setItem('currentStoreId', storeId);
      toast.success(`Loja alterada para ${store.name}`);
    }
  };

  const refreshStores = async () => {
    setIsLoading(true);
    await fetchStores();
  };

  const canManageStore = (storeId: string): boolean => {
    if (userRole?.includes('franchisee_master')) return true;
    const store = stores.find(s => s.id === storeId);
    return store?.franchisee_user_id === user?.id;
  };

  const toggleStoreStatus = async (isOpen: boolean) => {
    if (!currentStore) return;

    try {
      const { error } = await supabase
        .from('stores')
        .update({ status: isOpen ? 'open' : 'closed' })
        .eq('id', currentStore.id);

      if (error) throw error;

      setCurrentStore(prev => prev ? { ...prev, status: isOpen ? 'open' : 'closed' } : null);
      setStores(prev => prev.map(s => s.id === currentStore.id ? { ...s, status: isOpen ? 'open' : 'closed' } : s));

      toast.success(isOpen ? 'Loja aberta com sucesso!' : 'Loja fechada com sucesso!');
    } catch (error) {
      console.error('Error toggling store status:', error);
      toast.error('Erro ao atualizar status da loja');
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        stores,
        isLoading,
        switchStore,
        refreshStores,
        canManageStore,
        toggleStoreStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
