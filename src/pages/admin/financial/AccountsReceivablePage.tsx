'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Loader2, FileSpreadsheet, Download, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import AccountsReceivableFormDialog from './components/AccountsReceivableFormDialog';
import { useFranchiseeId } from '@/hooks/useFranchiseeId';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AccountsReceivablePage() {
    const now = new Date();
    const [dateStart, setDateStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
    const [filterCD, setFilterCD] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'receive'; id: string | null; open: boolean }>({
        type: 'delete',
        id: null,
        open: false,
    });

    const { data: franchiseeId } = useFranchiseeId();

    const { data: receivables = [], isLoading, refetch } = useQuery({
        queryKey: ['accounts_receivable', dateStart, dateEnd, filterCD, filterStatus, franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];

            let query = supabase
                .from('accounts_receivable' as any)
                .select(`
                    *,
                    distribution_center:distribution_centers(name, franchisee_user_id),
                    client:financial_clients(name, document)
                `)
                .gte('due_date', dateStart)
                .lte('due_date', dateEnd)
                .order('due_date', { ascending: true });

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            }

            if (filterStatus !== 'all') {
                if (filterStatus === 'paid') query = query.eq('paid', true);
                if (filterStatus === 'pending') query = query.eq('paid', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    const totalReceivables = useMemo(() =>
        receivables.reduce((sum, r: any) => sum + Number(r.amount), 0), [receivables]);

    const totalPending = useMemo(() =>
        receivables.filter(r => !r.paid).reduce((sum, r: any) => sum + Number(r.amount), 0), [receivables]);

    const totalReceived = useMemo(() =>
        receivables.filter(r => r.paid).reduce((sum, r: any) => sum + Number(r.amount), 0), [receivables]);

    const handleEdit = (record: any) => {
        setEditRecord(record);
        setDialogOpen(true);
    };

    const handleNew = () => {
        setEditRecord(null);
        setDialogOpen(true);
    };

    const handleSuccess = () => {
        setDialogOpen(false);
        setEditRecord(null);
        refetch();
    };

    const openConfirmDialog = (type: 'delete' | 'receive', id: string) => {
        setConfirmDialog({ type, id, open: true });
    };

    const handleConfirmAction = async () => {
        if (!confirmDialog.id) return;

        if (confirmDialog.type === 'delete') {
            const { error } = await supabase.from('accounts_receivable' as any).delete().eq('id', confirmDialog.id);
            if (error) {
                alert('Erro ao excluir: ' + error.message);
            } else {
                refetch();
            }
        } else if (confirmDialog.type === 'receive') {
            const { error } = await supabase
                .from('accounts_receivable' as any)
                .update({ paid: true, paid_date: new Date().toISOString().split('T')[0] })
                .eq('id', confirmDialog.id);

            if (error) {
                alert('Erro ao confirmar recebimento: ' + error.message);
            } else {
                refetch();
            }
        }
        setConfirmDialog({ ...confirmDialog, open: false });
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contas a Receber</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">Gestão de recebíveis e previsões de entrada</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleNew} className="bg-green-600 hover:bg-green-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Novo Recebimento
                    </Button>
                </div>
            </div>

            {/* Summary + Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg shadow-green-500/20 sm:col-span-2 lg:col-span-2">
                    <CardContent className="p-5 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-white/80 font-medium">Previsão Total</p>
                            <p className="text-sm font-bold text-white tracking-tight">{formatBRL(totalReceivables)}</p>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-white/80 font-medium">Já Recebido</p>
                            <p className="text-sm font-bold text-white tracking-tight">{formatBRL(totalReceived)}</p>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/20 pt-2 mt-1">
                            <p className="text-sm text-white font-bold">A Receber</p>
                            <p className="text-xl font-black text-white tracking-tight">{formatBRL(totalPending)}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="w-full">
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">CD</label>
                    <DistributionCenterSelect value={filterCD} onChange={setFilterCD} placeholder="Todos os CDs" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Status</label>
                    <select
                        className="w-full h-10 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 text-sm text-gray-900 dark:text-white outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="paid">Recebidos</option>
                        <option value="pending">Pendentes</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">De (Vencimento)</label>
                    <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Até (Vencimento)</label>
                    <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </div>
            </div>

            <Card className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200 dark:border-white/[0.06] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Vencimento</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Cliente</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Descrição</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">CD</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Valor</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                                {isLoading && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-500" />
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && receivables.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-gray-400 dark:text-white/30">
                                            Nenhuma conta a receber encontrada no período
                                        </td>
                                    </tr>
                                )}
                                {receivables.map((rec: any) => {
                                    const isOverdue = !rec.paid && new Date(rec.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

                                    return (
                                        <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                        {format(new Date(rec.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                                    </span>
                                                    {isOverdue && <span className="text-[10px] text-red-500 font-bold">Em atraso</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <Badge variant="outline" className={rec.paid ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}>
                                                    {rec.paid ? `Recebido (${format(new Date(rec.paid_date + 'T12:00:00'), 'dd/MM')})` : 'Pendente'}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-900 dark:text-white font-medium">
                                                {rec.client?.name || '-'}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-white/60">
                                                {rec.description}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-white/60">
                                                {rec.distribution_center?.name || 'Geral'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-gray-900 dark:text-white">
                                                {formatBRL(Number(rec.amount))}
                                            </td>
                                            <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                                                {!rec.paid && (
                                                    <Button size="sm" variant="ghost" title="Confirmar Recebimento" onClick={() => openConfirmDialog('receive', rec.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(rec)} title="Visualizar/Editar">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => openConfirmDialog('delete', rec.id)} title="Excluir" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {receivables.length > 0 && (
                                <tfoot className="border-t-2 border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] font-bold">
                                    <tr>
                                        <td className="px-5 py-4 text-gray-900 dark:text-white uppercase text-xs" colSpan={5}>
                                            Total
                                        </td>
                                        <td className="px-5 py-4 text-right text-green-600 dark:text-green-400">
                                            {formatBRL(totalReceivables)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </CardContent>
            </Card>

            <AccountsReceivableFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                record={editRecord}
                onSuccess={handleSuccess}
            />

            <Dialog open={confirmDialog.open} onOpenChange={(val) => setConfirmDialog({ ...confirmDialog, open: val })}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            {confirmDialog.type === 'receive' ? 'Confirmar Recebimento' : 'Excluir Conta a Receber'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-white/60">
                            {confirmDialog.type === 'receive'
                                ? 'Deseja marcar esta conta como recebida hoje? Esta ação atualizará o status do recebimento.'
                                : 'Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} className="border-gray-200 dark:border-white/10">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmAction}
                            className={`${confirmDialog.type === 'receive' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                        >
                            {confirmDialog.type === 'receive' ? 'Confirmar' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
