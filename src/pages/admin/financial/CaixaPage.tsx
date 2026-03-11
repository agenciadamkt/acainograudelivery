'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    Landmark,
    ArrowLeftRight,
    TrendingUp,
    TrendingDown,
    Plus,
    History,
    Search,
    Filter,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AccountSelect from './components/AccountSelect';
import CurrencyInput from './components/CurrencyInput';

/* ─── Helpers ─── */
const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CaixaPage() {
    const queryClient = useQueryClient();
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferData, setTransferData] = useState({
        from: '',
        to: '',
        amount: 0,
        description: ''
    });

    /* ── Fetch Accounts ── */
    const { data: accounts, isLoading: loadingAccounts } = useQuery({
        queryKey: ['financial_accounts'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('financial_accounts' as any)
                .select('*')
                .eq('active', true)
                .in('franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38'])
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    /* ── Fetch Transfers (Statement) ── */
    const { data: transfers, isLoading: loadingTransfers } = useQuery({
        queryKey: ['financial_transfers_statement'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('financial_transfers' as any)
                .select(`
                    *,
                    origin:financial_accounts!from_account_id(name, franchisee_user_id),
                    destination:financial_accounts!to_account_id(name, franchisee_user_id)
                `)
                .order('created_at', { ascending: false })
                .eq('origin.franchisee_user_id', user?.id)
                .limit(20);
            if (error) throw error;
            return data as any[];
        }
    });

    /* ── Transfer Mutation ── */
    const transferMutation = useMutation({
        mutationFn: async (values: typeof transferData) => {
            if (!values.from || !values.to || values.amount <= 0) {
                throw new Error('Preencha todos os campos corretamente');
            }
            if (values.from === values.to) {
                throw new Error('Contas de origem e destino devem ser diferentes');
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('financial_transfers' as any)
                .insert({
                    from_account_id: values.from,
                    to_account_id: values.to,
                    amount: values.amount,
                    description: values.description,
                    created_by: user?.id
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_accounts'] });
            queryClient.invalidateQueries({ queryKey: ['financial_transfers_statement'] });
            toast.success('Transferência realizada com sucesso!');
            setIsTransferOpen(false);
            setTransferData({ from: '', to: '', amount: 0, description: '' });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao realizar transferência');
        }
    });

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'bank': return <Landmark className="h-5 w-5" />;
            default: return <Wallet className="h-5 w-5" />;
        }
    };

    return (
        <div className="p-4 lg:p-8 space-y-8 bg-gray-50/50 dark:bg-transparent min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Caixa & Contas
                    </h1>
                    <p className="text-gray-500 dark:text-white/40 text-sm mt-1">
                        Gerencie seus saldos e transferências entre contas.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsTransferOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-600/20 rounded-xl"
                    >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Transferir
                    </Button>
                </div>
            </div>

            {/* Bento Grid: Accounts Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingAccounts ? (
                    <div className="col-span-full flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    accounts?.map((account, idx) => (
                        <motion.div
                            key={account.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="relative overflow-hidden bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:shadow-purple-500/5 transition-all duration-300">
                                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${account.type === 'cash' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2.5 rounded-xl ${account.type === 'cash' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600'}`}>
                                            {getAccountIcon(account.type)}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${account.type === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {account.type}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mt-4">
                                        {account.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {formatBRL(Number(account.balance))}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 dark:text-white/40">
                                        <History className="h-3 w-3" />
                                        Última atualização: {format(new Date(account.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Statement Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Latests Transactions (Extrato) */}
                <Card className="lg:col-span-2 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.05]">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl">
                                <History className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-xl font-bold">Extrato de Movimentações</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500"><Filter className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500"><Search className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-100 dark:border-white/[0.05]">
                                        <th className="px-6 py-4 font-semibold text-gray-400 dark:text-white/20 uppercase tracking-widest text-[10px]">Data</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 dark:text-white/20 uppercase tracking-widest text-[10px]">Origem / Destino</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 dark:text-white/20 uppercase tracking-widest text-[10px]">Descrição</th>
                                        <th className="px-6 py-4 font-semibold text-gray-400 dark:text-white/20 uppercase tracking-widest text-[10px] text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
                                    {transfers?.map((t) => (
                                        <tr key={t.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {format(new Date(t.created_at), 'dd MMM', { locale: ptBR })}
                                                </span>
                                                <p className="text-[10px] text-gray-400">{format(new Date(t.created_at), 'HH:mm')}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-gray-500 dark:text-white/40">{t.origin?.name}</span>
                                                    <ArrowRightUp className="h-3 w-3 text-purple-400" />
                                                    <span className="text-gray-900 dark:text-white font-bold">{t.destination?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-white/40 italic">
                                                {t.description || 'Transferência interna'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-purple-600 dark:text-purple-400 font-bold text-base">
                                                    {formatBRL(Number(t.amount))}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {transfers?.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                                Nenhuma transferência registrada recentemente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Selection / Quick Stats Bento Side */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 border-0 shadow-2xl shadow-purple-600/20 text-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Visão Geral
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-indigo-100 text-xs font-medium">Total em Contas</p>
                                    <p className="text-3xl font-black">
                                        {formatBRL(accounts?.reduce((acc, a) => acc + Number(a.balance), 0) || 0)}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-white/60 text-[10px] uppercase font-bold">Transferido (mês)</p>
                                        <p className="text-lg font-bold">
                                            {formatBRL(transfers?.reduce((acc, t) => acc + Number(t.amount), 0) || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-[10px] uppercase font-bold">Taxas / Outros</p>
                                        <p className="text-lg font-bold text-red-200">R$ 0,00</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 right-0 p-4 opacity-10">
                            <Landmark className="h-24 w-24" />
                        </div>
                    </Card>

                    <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Dica de Gestão</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-gray-500 dark:text-white/40 leading-relaxed">
                                Mantenha seu **Caixa Geral** sempre conciliado com os fechamentos físicos diários. Utilize as transferências para organizar o fluxo de entrada no banco.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Transfer Modal Overlay */}
            <AnimatePresence>
                {isTransferOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsTransferOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#1A1A24] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600" />

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nova Transferência</h3>
                                <button onClick={() => setIsTransferOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                                    <Plus className="h-5 w-5 rotate-45" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</label>
                                    <AccountSelect
                                        value={transferData.from}
                                        onChange={(v) => setTransferData(p => ({ ...p, from: v }))}
                                        placeholder="Conta de débito"
                                    />
                                </div>
                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-full flex items-center justify-center border-4 border-white dark:border-[#1A1A24] shadow-sm">
                                        <ArrowLeftRight className="h-3 w-3" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Destino</label>
                                    <AccountSelect
                                        value={transferData.to}
                                        onChange={(v) => setTransferData(p => ({ ...p, to: v }))}
                                        placeholder="Conta de crédito"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</label>
                                    <CurrencyInput
                                        value={transferData.amount}
                                        onChange={(v) => setTransferData(p => ({ ...p, amount: v }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição (Opcional)</label>
                                    <Input
                                        value={transferData.description}
                                        onChange={(e) => setTransferData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Ex: Depósito Bradesco"
                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                                    />
                                </div>

                                <Button
                                    onClick={() => transferMutation.mutate(transferData)}
                                    disabled={transferMutation.isPending}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl mt-4 shadow-lg shadow-purple-600/20"
                                >
                                    {transferMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Transferência'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Simple icon component fix (ArrowRightUp not existing in Lucide, using similar)
function ArrowRightUp(props: any) {
    return <ArrowUpRight {...props} />
}
