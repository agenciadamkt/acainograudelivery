'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Info,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatBRL } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    paymentMethod: string;
    isFranchisee: boolean;
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemoveItem: (id: string) => void;
    onClearCart: () => void;
    onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
    isOpen,
    onClose,
    items,
    paymentMethod,
    isFranchisee,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onCheckout
}) => {

    const isBoleto = paymentMethod === 'Boleto';

    const totals = React.useMemo(() => {
        let subtotal = 0;
        let feesTotal = 0;
        let advertisingFee = 0;

        items.forEach(item => {
            const itemBaseTotal = item.price * item.quantity;

            // 1. Taxa de Boleto (R$ fixo)
            const itemBoletoFee = isBoleto ? (item.taxa * item.quantity) : 0;

            // 2. Taxa de Publicidade (% sobre o preço base)
            const itemAdvFee = (isFranchisee && item.has_advertising_fee)
                ? (itemBaseTotal * (item.advertising_fee_percentage / 100))
                : 0;

            subtotal += itemBaseTotal + itemBoletoFee;
            feesTotal += itemBoletoFee;
            advertisingFee += itemAdvFee;
        });

        return {
            subtotal,
            feesTotal,
            advertisingFee,
            totalAmount: subtotal + advertisingFee
        };
    }, [items, isBoleto, isFranchisee]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-black z-[70] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Meu Carrinho</h2>
                                <p className="text-xs text-gray-500">{items.length} itens selecionados</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {items.length > 0 && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={onClearCart}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 uppercase tracking-widest px-3"
                                    >
                                        Limpar
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Items List */}
                        <ScrollArea className="flex-1 p-6">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                        <Trash2 className="h-8 w-8" />
                                    </div>
                                    <p className="font-medium">Seu carrinho está vazio</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex gap-4 group">
                                            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0">
                                                <img
                                                    src={item.image_url || 'https://images.unsplash.com/photo-1579954115545-a95291e68b98?auto=format&fit=crop&w=800&q=80'}
                                                    className="w-full h-full object-cover"
                                                    alt={item.name}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                                    <button 
                                                        onClick={() => onRemoveItem(item.id)}
                                                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="purple-price font-black text-sm">
                                                        {formatBRL(item.price)}
                                                    </span>
                                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl px-2 py-1 border border-gray-100 dark:border-white/5">
                                                        <button
                                                            onClick={() => onUpdateQuantity(item.id, -1)}
                                                            className="p-1 hover:bg-white dark:hover:bg-black/20 rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <Minus className="h-3.5 w-3.5" />
                                                        </button>
                                                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => onUpdateQuantity(item.id, 1)}
                                                            className="p-1 hover:bg-white dark:hover:bg-black/20 rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {isBoleto && item.taxa > 0 && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/10 px-2 py-1 rounded-lg w-fit">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Taxa de Boleto: +{formatBRL(item.taxa)}/un
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        {/* Footer / Totals */}
                        <div className="p-6 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 space-y-4">

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {formatBRL(totals.subtotal - totals.feesTotal)}
                                    </span>
                                </div>

                                {isBoleto && totals.feesTotal > 0 && (
                                    <div className="flex justify-between text-sm text-orange-600">
                                        <div className="flex items-center gap-1">
                                            <CreditCard className="h-3 w-3" />
                                            <span>Taxas de Boleto</span>
                                        </div>
                                        <span className="font-bold">+{formatBRL(totals.feesTotal)}</span>
                                    </div>
                                )}

                                {isFranchisee && totals.advertisingFee > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <div className="flex items-center gap-1">
                                            <Info className="h-3 w-3" />
                                            <span>Fundo de Publicidade</span>
                                        </div>
                                        <span className="font-bold">+{formatBRL(totals.advertisingFee)}</span>
                                    </div>
                                )}

                                <Separator className="my-2 opacity-50" />

                                <div className="flex justify-between items-end">
                                    <span className="text-lg font-bold">Total</span>
                                    <span className="text-2xl font-black text-purple-600">
                                        {formatBRL(totals.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={onCheckout}
                                    disabled={items.length === 0}
                                    className="w-full h-14 rounded-[1.25rem] bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg shadow-xl shadow-purple-500/20"
                                >
                                    Finalizar Pedido
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={onClose}
                                    className="w-full h-12 rounded-[1.25rem] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                >
                                    Continuar Comprando
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
