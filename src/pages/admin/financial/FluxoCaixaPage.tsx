'use client';

import { useState } from 'react';
import { GrauOSLayout } from '@/components/admin/GrauOSLayout';
import {
    TrendingUp,
    ArrowUpCircle,
    ArrowDownCircle,
    Clock,
    AlertCircle,
    Search,
    Filter,
    Download,
    Plus,
    Calendar as CalendarIcon,
    ChevronDown,
    MoreHorizontal,
    Eye,
    Edit2,
    XCircle,
    CheckCircle2,
    Trash2,
    FileText,
    ListFilter,
    File,
    FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RecordFormDialog } from './components/RecordFormDialog';
import { ActionDialog } from './components/ActionDialog';
import { ProofDialog } from './components/ProofDialog';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FluxoCaixaPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [dateStart, setDateStart] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | null>(null);
    const [isProofOpen, setIsProofOpen] = useState(false);
    const [selectedProof, setSelectedProof] = useState<string | null>(null);

    // Check admin
    const { data: user } = useQuery({
        queryKey: ['check-admin-financial'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        }
    });
    const isAdmin = user?.email === 'agenciadamkt@gmail.com';

    // Fetch records
    const { data: records, isLoading, refetch } = useQuery({
        queryKey: ['financial_records', statusFilter, typeFilter, dateStart, dateEnd],
        queryFn: async () => {
            let query = supabase
                .from('financial_records' as any) // Cast to any to bypass type check if types are outdated
                .select(`
                    *,
                    financial_clients (name)
                `)
                .order('transaction_date', { ascending: false });

            // Apply DB filters
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            if (typeFilter !== 'all') query = query.eq('transaction_type', typeFilter);
            if (dateStart) query = query.gte('transaction_date', dateStart);
            if (dateEnd) query = query.lte('transaction_date', dateEnd);

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        // We use select to transform data if needed, but filtering name is easier done in component for now
        // since Supabase doesn't support ILIKE on foreign tables easily without complicated syntax or views
    });

    // Client-side search filtering (Name, Order, Description)
    const filteredRecords = records?.filter((record: any) => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();
        return (
            record.financial_clients?.name?.toLowerCase().includes(lowerTerm) ||
            record.order_number?.toLowerCase().includes(lowerTerm) ||
            record.description?.toLowerCase().includes(lowerTerm)
        );
    });

    // Stats calculation based on filtered records
    const stats = filteredRecords?.reduce((acc: any, curr: any) => {
        const val = Number(curr.amount);
        acc.total += val;
        acc.count += 1;
        if (curr.status === 'approved') acc.approved += val;
        if (curr.status === 'pending') acc.pending += val;
        if (curr.status === 'rejected') acc.rejected += val;
        return acc;
    }, { total: 0, count: 0, approved: 0, pending: 0, rejected: 0 }) || { total: 0, count: 0, approved: 0, pending: 0, rejected: 0 };

    const handleAction = (record: any, type: 'approve' | 'reject' | 'cancel') => {
        setSelectedRecord(record);
        setActionType(type);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Fluxo de Caixa - Relatório", 14, 15);
        doc.setFontSize(10);
        doc.text(`Período: ${format(new Date(dateStart), 'dd/MM/yyyy')} a ${format(new Date(dateEnd), 'dd/MM/yyyy')}`, 14, 22);

        const tableData = filteredRecords.map((r: any) => [
            format(new Date(r.transaction_date), 'dd/MM/yyyy'),
            r.financial_clients?.name || '-',
            r.transaction_type === 'sale' ? 'Venda' : r.transaction_type === 'write_off' ? 'Baixa' : 'Outros',
            `R$ ${Number(r.amount).toFixed(2)}`,
            r.status === 'approved' ? 'Aprovado' : r.status === 'pending' ? 'Pendente' : 'Rejeitado'
        ]);

        autoTable(doc, {
            head: [['Data', 'Cliente', 'Tipo', 'Valor', 'Status']],
            body: tableData,
            startY: 25,
        });

        doc.save('fluxo-caixa.pdf');
    };

    const handleExportExcel = () => {
        // Simple CSV generation
        const headers = ["Data", "Cliente", "Tipo", "Valor", "Status", "Descricao", "Pedido"];
        const rows = filteredRecords.map((r: any) => [
            format(new Date(r.transaction_date), 'dd/MM/yyyy'),
            r.financial_clients?.name || '',
            r.transaction_type,
            Number(r.amount).toFixed(2),
            r.status,
            r.description || '',
            r.order_number || ''
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(";") + "\n"
            + rows.map((e: any[]) => e.join(";")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "fluxo_caixa_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <GrauOSLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fluxo de Caixa</h1>
                        <p className="text-sm text-gray-500 dark:text-white/40">Gestão financeira da distribuidora</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white">
                                        <Download className="h-4 w-4" /> Exportar
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={handleExportPDF}>
                                        <File className="mr-2 h-4 w-4" /> Exportar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportExcel}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel (CSV)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                        >
                            <Plus className="h-4 w-4" /> Novo Lançamento
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-white/40">Total Registros</CardTitle>
                            <ListFilter className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.count}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Lançamentos no período</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-white/40">Total Recebido</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Todas as transações</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-white/40">Aprovado</CardTitle>
                            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                R$ {stats.approved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Confirmado em conta</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-white/40">Pendente</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Aguardando conferência</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-white/40">Rejeitado/Canc</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                R$ {stats.rejected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Títulos não compensados</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & List */}
                <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-white/[0.05] flex flex-col md:flex-row gap-4 items-end md:items-center">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
                            < div >
                                <span className="text-xs text-gray-500 mb-1 block">Início</span>
                                <Input
                                    type="date"
                                    value={dateStart}
                                    onChange={(e) => setDateStart(e.target.value)}
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">Fim</span>
                                <Input
                                    type="date"
                                    value={dateEnd}
                                    onChange={(e) => setDateEnd(e.target.value)}
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">Tipo</span>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="sale">Venda</SelectItem>
                                        <SelectItem value="write_off">Baixa</SelectItem>
                                        <SelectItem value="other">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">Status</span>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                        <SelectItem value="approved">Aprovado</SelectItem>
                                        <SelectItem value="rejected">Rejeitado</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="relative w-full md:w-64">
                            <span className="text-xs text-gray-500 mb-1 block">Busca</span>
                            <Search className="absolute left-3 top-8 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar cliente..."
                                className="pl-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/40 font-medium border-b border-gray-100 dark:border-white/[0.05]">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Valor</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando registros...</td></tr>
                                ) : filteredRecords?.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                                ) : filteredRecords?.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                                            {format(new Date(record.transaction_date), 'dd/MM/yyyy')}
                                            <div className="text-xs text-gray-400 font-normal">{format(new Date(record.created_at), 'HH:mm', { locale: ptBR })}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-white/80">
                                            {record.financial_clients?.name}
                                            {record.order_number && (
                                                <div className="text-xs text-gray-400">Ped: {record.order_number}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="text-xs font-normal border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60">
                                                {record.transaction_type === 'sale' ? 'Venda' : record.transaction_type === 'write_off' ? 'Baixa' : 'Outros'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-bold">
                                            R$ {Number(record.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={`
                                                ${record.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                                    record.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                                                        record.status === 'cancelled' ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50' :
                                                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}
                                                border-0 px-2 py-0.5
                                            `}>
                                                {record.status === 'approved' ? 'Aprovado' :
                                                    record.status === 'rejected' ? 'Rejeitado' :
                                                        record.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {record.evidence_url && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                                    onClick={() => { setSelectedProof(record.evidence_url); setIsProofOpen(true); }}
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Ver Comprovante</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                                onClick={() => { setSelectedRecord(record); setIsCreateOpen(true); }}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Visualizar / Editar</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                {isAdmin && record.status === 'pending' && (
                                                    <>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                                        onClick={() => handleAction(record, 'approve')}
                                                                    >
                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Aprovar</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                                        onClick={() => handleAction(record, 'reject')}
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Rejeitar</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </>
                                                )}

                                                {/* Cancel / Delete (Soft) */}
                                                {(record.status === 'pending') && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                                    onClick={() => handleAction(record, 'cancel')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Cancelar / Excluir</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <RecordFormDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                record={selectedRecord}
                onSuccess={() => {
                    refetch();
                    setIsCreateOpen(false);
                    setSelectedRecord(null);
                }}
            />

            <ActionDialog
                open={!!actionType}
                onOpenChange={(open) => !open && setActionType(null)}
                record={selectedRecord}
                type={actionType}
                onSuccess={() => {
                    refetch();
                    setActionType(null);
                    setSelectedRecord(null);
                }}
            />

            <ProofDialog
                open={isProofOpen}
                onOpenChange={setIsProofOpen}
                url={selectedProof}
            />
        </GrauOSLayout>
    );
}
