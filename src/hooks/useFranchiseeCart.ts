import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    price: number;
    unit: string;
    image_url: string | null;
    taxa: number;
    has_advertising_fee: boolean;
    advertising_fee_percentage: number;
}

interface CartItem extends Product {
    quantity: number;
}

export const useFranchiseeCart = () => {
    const [cart, setCart] = useState<Record<string, CartItem>>(() => {
        if (typeof window === 'undefined') return {};
        const saved = localStorage.getItem('franchisee_cart');
        if (!saved) return {};
        try {
            const parsed = JSON.parse(saved);
            // If it's an array (old format), convert to record
            if (Array.isArray(parsed)) {
                return parsed.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
            }
            return parsed;
        } catch (e) {
            console.error('Error parsing cart from localStorage:', e);
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem('franchisee_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product: Product, quantity: number = 1) => {
        setCart(prev => ({
            ...prev,
            [product.id]: {
                ...product,
                quantity: (prev[product.id]?.quantity || 0) + quantity
            }
        }));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const item = prev[productId];
            if (!item) return prev;
            const newQty = Math.max(0, item.quantity + delta);

            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [productId]: { ...item, quantity: newQty }
            };
        });
    };

    const removeItem = (productId: string) => {
        setCart(prev => {
            const { [productId]: _, ...rest } = prev;
            return rest;
        });
    };

    const clearCart = () => {
        setCart({});
    };

    const totalItems = useMemo(() => 
        Object.values(cart).reduce((acc, item) => acc + item.quantity, 0),
    [cart]);

    const totalPrice = useMemo(() => 
        Object.values(cart).reduce((acc, item) => acc + (item.price * item.quantity), 0),
    [cart]);

    const cartItems = useMemo(() => Object.values(cart), [cart]);

    return {
        cart,
        cartItems,
        totalItems,
        totalPrice,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart
    };
};
