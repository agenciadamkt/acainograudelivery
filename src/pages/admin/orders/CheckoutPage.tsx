'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    CreditCard,
    MapPin,
    Truck,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ShoppingBag,
    Info,
    ShieldCheck,
    Calendar,
    Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFranchiseeCart } from '@/hooks/useFranchiseeCart';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [paymentMethod, setPaymentMethod] = useState('A-vista');
    const [notes, setNotes] = useState('');

    const { cartItems, clearCart, totalPrice } = useFranchiseeCart();

    const totals = useMemo(() => {
        let subtotal = 0;
        let feesTotal = 0;
        let advertisingFee = 0;

        cartItems.forEach((item: any) => {
            const itemBaseTotal = item.price * item.quantity;
            const itemBoletoFee = paymentMethod === 'Boleto' ? (item.taxa * item.quantity) : 0;
            
            // Fundo de Publicidade incide sobre (Valor Base + Taxa de Boleto)
            const itemTotalForAdv = itemBaseTotal + itemBoletoFee;
            const itemAdvFee = (item.has_advertising_fee)
                ? (itemTotalForAdv * (item.advertising_fee_percentage / 100))
                : 0;
 
            subtotal += itemBaseTotal + itemBoletoFee;
            feesTotal += itemBoletoFee;
            advertisingFee += itemAdvFee;
        });

        return {
            subtotal,
            fees_total: feesTotal,
            advertising_fee: advertisingFee,
            total_amount: subtotal + advertisingFee,
            item_count: cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0)
        };
    }, [cartItems, paymentMethod]);

    const confirmOrderMutation = useMutation({
        mutationFn: async () => {
            // 1. Create Order Header
            const { data: order, error: orderError } = await supabase
                .from('franchisee_orders' as any)
                .insert({
                    franchisee_user_id: user?.id,
                    status: 'pending',
                    payment_method: paymentMethod,
                    notes,
                    subtotal: totals.subtotal,
                    fees_total: totals.fees_total,
                    advertising_fee: totals.advertising_fee,
                    total_amount: totals.total_amount
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = cartItems.map((item: any) => ({
                order_id: (order as any).id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price,
                taxa_boleto_unit_applied: paymentMethod === 'Boleto' ? item.taxa : 0
            }));

            const { error: itemsError } = await supabase
                .from('franchisee_order_items' as any)
                .insert(orderItems);

            if (itemsError) throw itemsError;

            return order;
        },
        onSuccess: () => {
            clearCart();
            queryClient.invalidateQueries({ queryKey: ['franchisee_orders_history'] });
            toast.success("Pedido Enviado com Sucesso!", {
                icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
                position: 'top-center'
            });
            navigate('/admin/orders/history');
        },
        onError: (error) => {
            console.error(error);
            toast.error("Erro ao enviar pedido. Tente novamente.");
        }
    });

    const paymentMethods = [
        {
            id: 'A-vista',
            name: 'A vista',
            desc: 'Vencimento em 7 dias corridos.',
            icon: <Zap className="h-5 w-5 text-emerald-500" />,
            note: 'PIX (Instantâneo) ou Cartão de Crédito.'
        },
    ];

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#030303] flex items-center justify-center p-6">
                <div className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="h-12 w-12 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-black">Seu carrinho está vazio</h2>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Você ainda não selecionou nenhum insumo para o seu pedido.</p>
                    <Button onClick={() => navigate('/admin/orders/catalog')} className="rounded-2xl h-14 px-8 bg-purple-600 font-bold">
                        Voltar ao Catálogo
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#030303] text-gray-900 dark:text-gray-100 selection:bg-purple-100 dark:selection:bg-purple-900/30">
            {/* Mesh Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-32">
                <header className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="h-14 w-14 rounded-2xl border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Finalizar Carga</h1>
                            <p className="text-gray-500 font-medium">Revise os detalhes antes de confirmar.</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-500/20">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-widest leading-none">Ambiente Seguro</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* Delivery Section */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Logística e Entrega</h3>
                            <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                                <CardContent className="p-8">
                                    <div className="flex gap-6">
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                            <MapPin className="h-8 w-8 text-purple-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black mb-1">Unidade Teresina - Matriz</h4>
                                            <p className="text-gray-500 font-medium leading-relaxed">Av. Raul Lopes, 1000 — Edifício Platinum Center, Fátima, Teresina - PI</p>
                                            <div className="flex items-center gap-2 mt-4 text-emerald-600 font-bold text-sm bg-emerald-50 dark:bg-emerald-900/10 w-fit px-3 py-1 rounded-full">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Previsão: Terça-feira, 14 Mar
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Payment Selection */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Escolha o Pagamento</h3>
                            <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                                <CardContent className="p-8">
                                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-4">
                                        {paymentMethods.map((method) => (
                                            <Label
                                                key={method.id}
                                                className={cn(
                                                    "flex items-center justify-between p-6 rounded-[1.75rem] border transition-all cursor-pointer group hover:bg-white dark:hover:bg-white/2",
                                                    paymentMethod === method.id
                                                        ? "border-purple-600 bg-purple-50/50 dark:bg-purple-900/10 ring-1 ring-purple-600"
                                                        : "border-gray-100 dark:border-white/10"
                                                )}
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                                        paymentMethod === method.id ? "bg-white dark:bg-white/10" : "bg-gray-100 dark:bg-white/5"
                                                    )}>
                                                        {method.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-lg tracking-tight">{method.name}</p>
                                                        <p className="text-xs text-gray-400 font-medium">{method.desc}</p>
                                                        {method.note && (
                                                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-orange-600 font-black uppercase tracking-tighter">
                                                                <AlertCircle className="h-3 w-3" />
                                                                {method.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <RadioGroupItem value={method.id} className="sr-only" />
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                    paymentMethod === method.id ? "border-purple-600 bg-purple-600" : "border-gray-300 dark:border-white/20"
                                                )}>
                                                    {paymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                                                </div>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Notes */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Instruções Adicionais</h3>
                            <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
                                <CardContent className="p-8">
                                    <Textarea
                                        placeholder="Ex: Ponto de referência, horário específico para recebimento..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="bg-transparent border-0 focus-visible:ring-0 text-lg font-medium min-h-[140px] resize-none placeholder:text-gray-400"
                                    />
                                </CardContent>
                            </Card>
                        </section>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="lg:col-span-5 lg:sticky lg:top-8">
                        <Card className="border-0 bg-white/60 dark:bg-black/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl shadow-purple-500/10 border border-white/20 dark:border-white/5">
                            <CardContent className="p-8 md:p-10 flex flex-col min-h-[500px]">
                                <h3 className="text-2xl font-black mb-8 border-b border-gray-100 dark:border-white/5 pb-6">Resumo da Carga</h3>

                                <div className="flex-1 space-y-6">
                                    {/* Item Count */}
                                    <div className="flex items-center justify-between text-gray-500 font-medium">
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag className="h-4 w-4" />
                                            <span>Produtos Selecionados</span>
                                        </div>
                                        <span className="font-black text-gray-900 dark:text-white">{totals.item_count} itens</span>
                                    </div>

                                    <Separator className="bg-gray-100 dark:bg-white/5" />

                                    {/* Breakdown */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Subtotal Base</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {formatBRL(totals.subtotal - totals.fees_total)}
                                            </span>
                                        </div>

                                        {paymentMethod === 'Boleto' && totals.fees_total > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex justify-between text-sm text-orange-600"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-3.5 w-3.5" />
                                                    <span className="font-black uppercase tracking-tighter">Taxas de Emissão (Boleto)</span>
                                                </div>
                                                <span className="font-black">+{formatBRL(totals.fees_total)}</span>
                                            </motion.div>
                                        )}

                                        {totals.advertising_fee > 0 && (
                                            <div className="flex justify-between text-sm text-indigo-600 dark:text-indigo-400">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    <span className="font-black uppercase tracking-tighter">Fundo de Publicidade</span>
                                                </div>
                                                <span className="font-black">+{formatBRL(totals.advertising_fee)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-sm text-emerald-600">
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-3.5 w-3.5" />
                                                <span className="font-black uppercase tracking-tighter">Frete de Logística Central</span>
                                            </div>
                                            <span className="font-black">Grátis</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Bottom Section */}
                                <div className="mt-12 space-y-8">
                                    <div className="p-8 rounded-[2rem] bg-purple-600 text-white relative overflow-hidden group">
                                        <div className="relative z-10 flex items-center justify-between">
                                            <span className="text-sm font-black uppercase tracking-widest opacity-80">Total Final</span>
                                            <div className="text-right">
                                                <p className="text-3xl md:text-4xl font-black tracking-tight">{formatBRL(totals.total_amount)}</p>
                                                <p className="text-[10px] uppercase font-bold opacity-60">Faturamento da Matriz</p>
                                            </div>
                                        </div>
                                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                    </div>

                                    <Button
                                        onClick={() => confirmOrderMutation.mutate()}
                                        disabled={confirmOrderMutation.isPending}
                                        className="w-full h-20 rounded-[1.75rem] bg-white dark:bg-white text-purple-600 hover:bg-gray-100 font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center gap-4"
                                    >
                                        {confirmOrderMutation.isPending ? (
                                            "Despachando..."
                                        ) : (
                                            <>
                                                Confirmar Pedido
                                                <ArrowRight className="h-6 w-6" />
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                        Ao confirmar, você aceita os termos <br /> de fornecimento da rede Açaí no Grau.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
