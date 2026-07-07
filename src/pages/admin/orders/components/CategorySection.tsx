'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/utils';
import { ProductImagePlaceholder } from './ProductImagePlaceholder';

interface Product {
    id: string;
    name: string;
    price: number;
    unit: string;
    image_url: string | null;
    current_stock: number;
    brand?: string | null;
    category_id: string;
}

interface CategorySectionProps {
    categoryName: string;
    products: Product[];
    cart: Record<string, { quantity: number }>;
    onAddToCart: (product: Product) => void;
    onUpdateQuantity: (productId: string, delta: number) => void;
    onViewAll: () => void;
    onProductClick: (productId: string) => void;
    animationDelay?: number;
}

const VISIBLE = 4;

export function CategorySection({
    categoryName,
    products,
    cart,
    onAddToCart,
    onUpdateQuantity,
    onViewAll,
    onProductClick,
    animationDelay = 0,
}: CategorySectionProps) {
    const [page, setPage] = useState(0);
    const maxPage = Math.max(0, Math.ceil(products.length / VISIBLE) - 1);
    const visible = products.slice(page * VISIBLE, page * VISIBLE + VISIBLE);

    if (!products.length) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animationDelay, duration: 0.4 }}
            className="space-y-4"
        >
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        {categoryName}
                    </h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {products.length} produto{products.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Nav arrows — only if there are more than VISIBLE products */}
                    {products.length > VISIBLE && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className={cn(
                                    "h-8 w-8 rounded-xl border flex items-center justify-center transition-all",
                                    page === 0
                                        ? "border-gray-200 dark:border-white/10 text-gray-300 dark:text-white/20 cursor-not-allowed"
                                        : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                                )}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                                disabled={page === maxPage}
                                className={cn(
                                    "h-8 w-8 rounded-xl border flex items-center justify-center transition-all",
                                    page === maxPage
                                        ? "border-gray-200 dark:border-white/10 text-gray-300 dark:text-white/20 cursor-not-allowed"
                                        : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                                )}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onViewAll}
                        className="text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest gap-1 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl h-9 px-4"
                    >
                        Ver todos
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Products Grid (4 per page) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {visible.map((p, idx) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <Card
                            className={cn(
                                "border-0 rounded-[1.5rem] overflow-hidden shadow-sm h-full flex flex-col transition-all duration-300",
                                p.current_stock === 0
                                    ? "bg-gray-100/70 dark:bg-white/3"
                                    : "bg-white/70 dark:bg-white/5 hover:shadow-lg hover:shadow-purple-500/10"
                            )}
                        >
                            {/* Image */}
                            <div
                                className={cn(
                                    "aspect-square bg-gray-50 dark:bg-white/3 relative overflow-hidden p-3",
                                    p.current_stock > 0 ? "cursor-pointer" : "cursor-default"
                                )}
                                onClick={() => p.current_stock > 0 && onProductClick(p.id)}
                            >
                                {p.current_stock === 0 && (
                                    <div className="absolute top-2 left-2 z-10">
                                        <Badge className="bg-gray-400 text-white border-0 font-black text-[9px] px-2 py-0.5 uppercase tracking-widest rounded-full">
                                            Indisponível
                                        </Badge>
                                    </div>
                                )}
                                {p.image_url ? (
                                    <img
                                        src={p.image_url}
                                        alt={p.name}
                                        loading="lazy"
                                        className={cn(
                                            "w-full h-full object-contain transition-transform duration-500",
                                            p.current_stock === 0
                                                ? "opacity-40 grayscale"
                                                : "hover:scale-110"
                                        )}
                                    />
                                ) : (
                                    <ProductImagePlaceholder className={cn(p.current_stock === 0 && "opacity-60")} />
                                )}
                            </div>

                            {/* Content */}
                            <CardContent className="p-3 flex flex-col gap-2 flex-1">
                                <div
                                    className={cn("flex-1", p.current_stock > 0 ? "cursor-pointer" : "")}
                                    onClick={() => p.current_stock > 0 && onProductClick(p.id)}
                                >
                                    {p.brand && (
                                        <p className="text-[9px] font-black text-purple-500/70 uppercase tracking-widest leading-none mb-1">
                                            {p.brand}
                                        </p>
                                    )}
                                    <h3 className={cn(
                                        "text-xs font-black leading-tight line-clamp-2 uppercase tracking-tight",
                                        p.current_stock === 0 ? "text-gray-400" : "text-gray-900 dark:text-white"
                                    )}>
                                        {p.name}
                                    </h3>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5">
                                    <p className={cn(
                                        "text-sm font-black leading-tight",
                                        p.current_stock === 0 ? "text-gray-400" : "text-gray-900 dark:text-white"
                                    )}>
                                        {formatBRL(p.price)}
                                    </p>

                                    {p.current_stock === 0 ? (
                                        <Button
                                            size="icon"
                                            disabled
                                            className="h-7 w-7 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed shadow-none"
                                        >
                                            <Plus className="h-3 w-3 opacity-40" />
                                        </Button>
                                    ) : cart[p.id]?.quantity > 0 ? (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(p.id, -1); }}
                                                className="h-6 w-6 rounded-lg border-gray-200 dark:border-white/10 p-0"
                                            >
                                                <Minus className="h-2.5 w-2.5" />
                                            </Button>
                                            <span className="text-xs font-black min-w-[1rem] text-center">
                                                {cart[p.id].quantity}
                                            </span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(p.id, 1); }}
                                                className="h-6 w-6 rounded-lg border-gray-200 dark:border-white/10 p-0"
                                            >
                                                <Plus className="h-2.5 w-2.5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); onAddToCart(p); }}
                                            className="h-7 w-7 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 active:scale-95 transition-all"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Dot indicators */}
            {products.length > VISIBLE && (
                <div className="flex items-center justify-center gap-1.5 pt-1">
                    {Array.from({ length: maxPage + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={cn(
                                "rounded-full transition-all",
                                i === page
                                    ? "w-5 h-1.5 bg-purple-600"
                                    : "w-1.5 h-1.5 bg-gray-300 dark:bg-white/20 hover:bg-purple-400"
                            )}
                        />
                    ))}
                </div>
            )}
        </motion.section>
    );
}
