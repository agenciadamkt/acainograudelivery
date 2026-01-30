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
  mercadopago_access_token: string | null;
  business_hours: any;
}

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  switchStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
  canManageStore: (storeId: string) => boolean;
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
      let query = supabase.from('stores').select('*');

      // Franchisee master can see all stores
      if (userRole?.includes('franchisee_master')) {
        query = query.order('name');
      } else {
        // Admin, manager, and staff only see their own stores
        query = query.eq('franchisee_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const storesData = (data as unknown as Store[]) || [];
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

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        stores,
        isLoading,
        switchStore,
        refreshStores,
        canManageStore,
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
