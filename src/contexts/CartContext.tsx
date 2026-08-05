import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isReservedSlug } from '@/lib/reservedSlugs';

export interface CartTopping {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  size_id: string;
  size_name: string;
  size_ml: number | null;
  size_price: number;
  quantity: number;
  toppings: CartTopping[];
  notes?: string;
  subtotal: number;
}

export interface DeliveryInfo {
  fee: number;
  distance: number;
  areaName?: string;
  allowed: boolean;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemSubtotal: (item: Omit<CartItem, 'id' | 'subtotal'>) => number;
  getStoreAwareRoute: () => string;
  deliveryFee: number;
  deliveryDistance: number;
  calculateDelivery: (clientLat: number, clientLng: number, storeId: string) => Promise<DeliveryInfo>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'acai-cart';
const LAST_STORE_KEY = 'last-visited-store';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);
  const [deliveryAreaName, setDeliveryAreaName] = useState<string>('');

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const getItemSubtotal = (item: Omit<CartItem, 'id' | 'subtotal'>) => {
    const toppingsTotal = item.toppings.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    return ((Number(item.size_price) || 0) + toppingsTotal) * (item.quantity || 1);
  };

  const addItem = (item: Omit<CartItem, 'id' | 'subtotal'>) => {
    setItems((prev) => {
      // Check if identical item exists
      const existingItemIndex = prev.findIndex((existing) => {
        // Check product and size
        if (existing.product_id !== item.product_id) return false;
        if (existing.size_id !== item.size_id) return false;

        // Check notes (normalize undefined to empty string)
        const note1 = existing.notes?.trim() || '';
        const note2 = item.notes?.trim() || '';
        if (note1 !== note2) return false;

        // Check toppings (deep comparison)
        if (existing.toppings.length !== item.toppings.length) return false;

        const existingToppingIds = existing.toppings.map(t => t.id).sort();
        const newToppingIds = item.toppings.map(t => t.id).sort();

        return existingToppingIds.every((id, index) => id === newToppingIds[index]);
      });

      // If exists, update quantity
      if (existingItemIndex > -1) {
        const newItems = [...prev];
        const existingItem = newItems[existingItemIndex];

        const newQuantity = existingItem.quantity + item.quantity;

        newItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: getItemSubtotal({ ...existingItem, quantity: newQuantity })
        };

        return newItems;
      }

      // If not exists, add new
      const id = `${Date.now()}-${Math.random()}`;
      const subtotal = getItemSubtotal(item);
      const newItem: CartItem = { ...item, id, subtotal };
      return [...prev, newItem];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, subtotal: getItemSubtotal({ ...item, quantity }) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getStoreAwareRoute = () => {
    // A loja mora no primeiro segmento da URL (/gurupi). Como não há mais o
    // prefixo /delivery/ pra identificar, o que distingue um caminho de loja
    // de uma rota fixa do app é justamente não ser um slug reservado.
    const [firstSegment] = window.location.pathname.split('/').filter(Boolean);

    if (firstSegment && !isReservedSlug(firstSegment)) {
      localStorage.setItem(LAST_STORE_KEY, firstSegment);
      return `/${firstSegment}`;
    }

    // Fora de uma loja (ex: /cart, /checkout), volta pra última visitada
    const lastStore = localStorage.getItem(LAST_STORE_KEY);
    if (lastStore) {
      return `/${lastStore}`;
    }

    // Fallback para menu geral
    return '/menu';
  };

  const calculateDelivery = async (clientLat: number, clientLng: number, storeId: string): Promise<DeliveryInfo> => {
    try {
      const { data: areas, error } = await supabase
        .from('delivery_areas' as any)
        .select('*')
        .eq('store_id', storeId)
        .eq('active', true);

      if (error) throw error;

      let matchedArea: any = null;
      let minRadius = Infinity;
      let distanceToStore = 0;

      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      if (areas && areas.length > 0) {
        for (const area of areas) {
          const dist = getDistance(clientLat, clientLng, area.center_lat, area.center_lng);
          if (dist <= area.radius_meters && area.radius_meters < minRadius) {
            minRadius = area.radius_meters;
            matchedArea = area;
            distanceToStore = dist;
          }
        }
      }

      if (matchedArea) {
        setDeliveryFee(matchedArea.fee);
        setDeliveryDistance(distanceToStore);
        setDeliveryAreaName(matchedArea.name);
        return { fee: matchedArea.fee, distance: distanceToStore, areaName: matchedArea.name, allowed: true };
      }

      // Fallback to store default if needed, or deny
      setDeliveryFee(0);
      return { fee: 0, distance: 0, allowed: false };

    } catch (e) {
      console.error('Error calculating delivery:', e);
      return { fee: 0, distance: 0, allowed: false };
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemSubtotal,
        getStoreAwareRoute,
        deliveryFee,
        deliveryDistance,
        calculateDelivery,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
