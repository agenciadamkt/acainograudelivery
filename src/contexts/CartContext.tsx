import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const getItemSubtotal = (item: Omit<CartItem, 'id' | 'subtotal'>) => {
    const toppingsTotal = item.toppings.reduce((sum, t) => sum + t.price, 0);
    return (item.size_price + toppingsTotal) * item.quantity;
  };

  const addItem = (item: Omit<CartItem, 'id' | 'subtotal'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const subtotal = getItemSubtotal(item);
    const newItem: CartItem = { ...item, id, subtotal };
    setItems((prev) => [...prev, newItem]);
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
    const currentPath = window.location.pathname;
    
    // Se está em uma loja específica, salvar e retornar
    if (currentPath.startsWith('/delivery/')) {
      const storeSlug = currentPath.split('/')[2]; // Pega 'gurupi' de '/delivery/gurupi'
      if (storeSlug) {
        localStorage.setItem(LAST_STORE_KEY, storeSlug);
      }
      return currentPath.split('/product/')[0].split('/cart')[0].split('/checkout')[0];
    }
    
    // Se não está em /delivery/, tentar recuperar última loja visitada
    const lastStore = localStorage.getItem(LAST_STORE_KEY);
    if (lastStore) {
      return `/delivery/${lastStore}`;
    }
    
    // Fallback para menu geral
    return '/menu';
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
