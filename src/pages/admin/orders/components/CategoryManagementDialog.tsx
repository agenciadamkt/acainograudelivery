'use client';

import React, { useState } from 'react';
import { 
    Tag, 
    Plus, 
    Trash2, 
    Save, 
    X, 
    GripVertical, 
    Power,
    Sparkles,
    LayoutGrid,
    Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    useFranchiseeProductCategories, 
    useCreateFranchiseeProductCategory, 
    useUpdateFranchiseeProductCategory, 
    useDeleteFranchiseeProductCategory 
} from '@/hooks/useFranchiseeProductCategories';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface CategoryManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
    const { data: categories, isLoading } = useFranchiseeProductCategories();
    const createCategory = useCreateFranchiseeProductCategory();
    const updateCategory = useUpdateFranchiseeProductCategory();
    const deleteCategory = useDeleteFranchiseeProductCategory();

    const [newCategoryName, setNewCategoryName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editOrder, setEditOrder] = useState<number>(0);

    const filteredCategories = categories?.filter(cat => 
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return;
        await createCategory.mutateAsync({
            name: newCategoryName,
            active: true,
            display_order: (categories?.length || 0) + 1,
            icon_url: null
        });
        setNewCategoryName('');
    };

    const handleStartEdit = (category: any) => {
        setEditingId(category.id);
        setEditValue(category.name);
        setEditOrder(category.display_order);
    };

    const handleSaveEdit = async (id: string) => {
        await updateCategory.mutateAsync({
            id,
            name: editValue,
            display_order: editOrder
        });
        setEditingId(null);
    };

    const handleToggleActive = async (id: string, active: boolean) => {
        await updateCategory.mutateAsync({
            id,
            active
        });
    };

    const handleDelete = async (id: string) => {
        await deleteCategory.mutateAsync(id);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white/80 dark:bg-[#080808]/90 backdrop-blur-2xl border-0 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]">
                <div className="flex flex-col h-[700px]">
                    {/* Header with Background Accent */}
                    <div className="relative p-10 pb-6 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-600/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Tag className="h-6 w-6" />
                                </div>
                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 flex gap-1.5 items-center px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase">
                                    <Sparkles className="h-3 w-3" />
                                    Categorias
                                </Badge>
                            </div>
                            <DialogTitle className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                                Gestão de Categorias
                            </DialogTitle>
                            <DialogDescription className="text-gray-500 font-medium text-lg mt-2">
                                Organize o catálogo adicionando, renomeando ou desativando categorias de insumos.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 overflow-hidden flex flex-col px-10 pb-10 gap-6">
                        {/* Action Bar */}
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 group w-full">
                                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500 group-focus-within:scale-110 transition-transform" />
                                <Input 
                                    placeholder="Nome da nova categoria..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    className="pl-12 h-14 rounded-2xl border-gray-100 dark:border-white/10 bg-white/50 dark:bg-white/5 focus:ring-purple-500 font-bold"
                                />
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={!newCategoryName.trim() || createCategory.isPending}
                                className="h-14 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black transition-all active:scale-95 shadow-lg shadow-purple-500/25"
                            >
                                {createCategory.isPending ? 'Criando...' : 'Adicionar'}
                            </Button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            <Input 
                                placeholder="Filtrar categorias existentes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-12 rounded-xl border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 focus:ring-purple-500 font-medium text-sm"
                            />
                        </div>

                        {/* Category List */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    <div className="flex flex-col gap-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 bg-gray-100/50 dark:bg-white/5 rounded-3xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : filteredCategories.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 dark:text-white/10">
                                            <LayoutGrid className="h-8 w-8" />
                                        </div>
                                        <p className="text-gray-400 font-bold">Nenhuma categoria encontrada.</p>
                                    </div>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <motion.div
                                            key={category.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={cn(
                                                "group relative flex items-center gap-4 p-5 rounded-3xl border transition-all",
                                                editingId === category.id 
                                                    ? "bg-purple-50/50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 shadow-xl" 
                                                    : "bg-white/40 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-500/20 shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="text-gray-400 dark:text-white/20">
                                                    <GripVertical className="h-5 w-5" />
                                                </div>

                                                {editingId === category.id ? (
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <Input 
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="h-10 rounded-xl bg-white dark:bg-black/40 border-purple-200 font-bold flex-1"
                                                            autoFocus
                                                        />
                                                        <div className="flex items-center gap-2 w-20">
                                                            <span className="text-[10px] font-black text-purple-400 uppercase">Pos.</span>
                                                            <Input 
                                                                type="number"
                                                                value={editOrder}
                                                                onChange={(e) => setEditOrder(Number(e.target.value))}
                                                                className="h-10 rounded-xl bg-white dark:bg-black/40 border-purple-200 font-bold text-center"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                                                            {category.name}
                                                            {!category.active && (
                                                                <Badge variant="secondary" className="px-2 py-0 h-4 text-[8px] font-black uppercase bg-gray-200 dark:bg-white/10 text-gray-500">Inativa</Badge>
                                                            )}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                            Posição: {category.display_order}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {editingId === category.id ? (
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-10 w-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-all"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            size="icon"
                                                            className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-90"
                                                            onClick={() => handleSaveEdit(category.id)}
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Switch 
                                                            checked={category.active}
                                                            onCheckedChange={(checked) => handleToggleActive(category.id, checked)}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                        
                                                        <div className="w-[1px] h-6 bg-gray-100 dark:bg-white/5 mx-1" />

                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 rounded-xl hover:bg-purple-100 dark:hover:bg-white/10 text-gray-400 hover:text-purple-600 transition-all"
                                                            onClick={() => handleStartEdit(category)}
                                                        >
                                                            <Sparkles className="h-4 w-4" />
                                                        </Button>

                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all"
                                                            onClick={() => handleDelete(category.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
