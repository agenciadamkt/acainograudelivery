'use client';

import { useState } from 'react';

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
    FileSpreadsheet,
    Users,
    ShieldAlert,
    Sparkles
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RecordFormDialog } from './components/RecordFormDialog';
import { BatchOCRDialog } from './components/BatchOCRDialog';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import { ActionDialog } from './components/ActionDialog';
import { ProofDialog } from './components/ProofDialog';
import { ManageUsersDialog } from './components/ManageUsersDialog';
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';

export default function FluxoCaixaPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [dateStart, setDateStart] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [quickDateFilter, setQuickDateFilter] = useState<string>('month');
    const [selectedCD, setSelectedCD] = useState<string>('');

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | null>(null);
    const [isProofOpen, setIsProofOpen] = useState(false);
    const [isBatchOCROpen, setIsBatchOCROpen] = useState(false);
    const [selectedProof, setSelectedProof] = useState<string | null>(null);
    const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);

    // Check admin
    const { data: user } = useQuery({
        queryKey: ['check-admin-financial'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        }
    });

    // Master admin email (always has full access)
    const MASTER_EMAIL = 'agenciadamkt@gmail.com';

    // Check if user is authorized and determine role
    const { data: financialAccess, isLoading: isCheckingAccess } = useQuery({
        queryKey: ['financial_access'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Check manual access table
            const { data: access } = await supabase
                .from('financial_users' as any)
                .select('*')
                .eq('email', user.email)
                .single();

            if (access) {
                const accessData = access as any;
                return {
                    ...accessData,
                    authorized: !!accessData.active,
                    isAdmin: accessData.role === 'admin'
                };
            }

            // Fallback for known admins if not in table yet (but still authorized)
            const isKnownAdmin = user.email === 'agenciadamkt@gmail.com' || user.email === 'acainograuwagner@gmail.com';
            if (isKnownAdmin) {
                return { authorized: true, isAdmin: true, role: 'admin', name: 'Administrador' };
            }

            return null;
        }
    });

    const { data: centers = [] } = useQuery({
        queryKey: ['distribution_centers_fluxo'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .select('*')
                .eq('active', true)
                .in('franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38'])
                .order('name');
            if (error) throw error;
            return data as any[];
        },
    });


    const isAdmin = financialAccess?.isAdmin || false;
    const isAuthorized = financialAccess?.authorized || false;

    // Fetch records
    const { data: records, isLoading, refetch } = useQuery({
        queryKey: ['financial_records', statusFilter, typeFilter, dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            let query = supabase
                .from('financial_records' as any)
                .select(`
                    *,
                    financial_clients (name),
                    distribution_center:distribution_centers!inner(franchisee_user_id)
                `)
                .order('transaction_date', { ascending: false });

            // Apply DB filters
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            if (typeFilter !== 'all') query = query.eq('transaction_type', typeFilter);
            if (dateStart) query = query.gte('transaction_date', dateStart);
            if (dateEnd) query = query.lte('transaction_date', dateEnd);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.in('distribution_center.franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
    });

    // Fetch financial users lookup (to map user_id -> name)
    const { data: financialUsersList } = useQuery({
        queryKey: ['financial_users_lookup'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('financial_users' as any)
                .select('email, name, user_id');
            if (error) return [];
            return data as any[];
        },
    });

    // Build lookup map: user_id -> name (and email -> name)
    const userNameMap = new Map<string, string>();
    financialUsersList?.forEach((u: any) => {
        if (u.user_id) userNameMap.set(u.user_id, u.name);
        if (u.email) userNameMap.set(u.email, u.name);
    });
    // Always map master admin
    userNameMap.set(MASTER_EMAIL, 'Admin Master');

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
        acc.count += 1;
        // Não somar cancelados/rejeitados no total recebido
        if (curr.status !== 'cancelled' && curr.status !== 'rejected') {
            acc.total += val;
        }
        if (curr.status === 'approved') acc.approved += val;
        if (curr.status === 'pending') acc.pending += val;
        if (curr.status === 'rejected') acc.rejected += val;
        if (curr.status === 'cancelled') acc.cancelled += val;
        return acc;
    }, { total: 0, count: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }) || { total: 0, count: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 };

    const handleAction = (record: any, type: 'approve' | 'reject' | 'cancel') => {
        setSelectedRecord(record);
        setActionType(type);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF();
        const centerName = selectedCD
            ? centers.find((c: any) => c.id === selectedCD)?.name
            : 'Todos os CDs';

        let currentY = await addPdfBranding(doc, centerName);

        doc.setFontSize(14);
        doc.text("Financeiro no Grau - Relatório Detalhado", 14, currentY + 5);
        doc.setFontSize(10);
        doc.text(`Período: ${format(new Date(dateStart + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(dateEnd + 'T12:00:00'), 'dd/MM/yyyy')}`, 14, currentY + 12);

        currentY += 20;

        // Grouping data
        const groups: Record<string, any[]> = { sale: [], write_off: [], other: [] };
        (filteredRecords || []).forEach((r: any) => {
            const type = r.transaction_type || 'other';
            if (groups[type]) groups[type].push(r);
            else groups['other'].push(r); // fallback
        });

        const typeLabels: Record<string, string> = { sale: 'Vendas', write_off: 'Baixas', other: 'Outros' };
        let grandTotal = 0;
        let grandCount = 0;

        // Iterate over groups
        for (const type of ['sale', 'write_off', 'other']) {
            const groupRecords = groups[type];
            if (groupRecords.length === 0) continue;

            const subTotal = groupRecords
                .filter((r: any) => r.status === 'approved')
                .reduce((sum, r) => sum + Number(r.amount), 0);

            grandTotal += subTotal;
            grandCount += groupRecords.length;

            // Section Header
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`${typeLabels[type]} (${groupRecords.length} registros)`, 14, currentY + 5);
            currentY += 7;

            const tableData = groupRecords.map((r: any) => [
                format(new Date(r.transaction_date + 'T12:00:00'), 'dd/MM/yyyy'),
                r.financial_clients?.name || '-',
                `R$ ${Number(r.amount).toFixed(2)}`,
                r.status === 'approved' ? 'Aprovado' : r.status === 'pending' ? 'Pendente' : 'Rejeitado'
            ]);

            autoTable(doc, {
                head: [['Data', 'Cliente', 'Valor', 'Status']],
                body: tableData,
                startY: currentY,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [60, 60, 60] },
                margin: { left: 14, right: 14 },
            });

            // Update currentY for next section
            currentY = (doc as any).lastAutoTable.finalY + 2;

            // Subtotal Row
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`Subtotal ${typeLabels[type]}: R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, currentY + 5);
            currentY += 10;
        }

        // Grand Total Section
        currentY += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, currentY, 196, currentY);
        currentY += 7;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL GERAL (${grandCount} registros): R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, currentY);

        doc.save('fluxo-caixa-detalhado.pdf');
    };

    const handleExportExcel = () => {
        const groups: Record<string, any[]> = { sale: [], write_off: [], other: [] };
        (filteredRecords || []).forEach((r: any) => {
            const type = r.transaction_type || 'other';
            if (groups[type]) groups[type].push(r);
            else groups['other'].push(r);
        });

        const typeLabels: Record<string, string> = { sale: 'VENDAS', write_off: 'BAIXAS', other: 'OUTROS' };
        let csvContent = "data:text/csv;charset=utf-8,";
        let grandTotal = 0;
        let grandCount = 0;

        // Iterate groups
        for (const type of ['sale', 'write_off', 'other']) {
            const groupRecords = groups[type];
            if (groupRecords.length === 0) continue;

            const subTotal = groupRecords
                .filter((r: any) => r.status === 'approved')
                .reduce((sum, r) => sum + Number(r.amount), 0);

            grandTotal += subTotal;
            grandCount += groupRecords.length;

            // Section Header
            csvContent += `\n${typeLabels[type]}\n`;
            csvContent += "Data;Cliente;Valor;Status;Descricao;Pedido\n";

            groupRecords.forEach((r: any) => {
                const row = [
                    format(new Date(r.transaction_date + 'T12:00:00'), 'dd/MM/yyyy'),
                    r.financial_clients?.name || '',
                    Number(r.amount).toFixed(2),
                    r.status,
                    r.description || '',
                    r.order_number || ''
                ];
                csvContent += row.join(";") + "\n";
            });

            // Subtotal
            csvContent += `;;SUBTOTAL ${typeLabels[type]};${subTotal.toFixed(2)};;;\n`;
        }

        // Grand Total
        csvContent += `\n;;TOTAL GERAL (${grandCount} items);${grandTotal.toFixed(2)};;;\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "fluxo_caixa_detalhado.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Access denied screen
    if (!isCheckingAccess && !isAuthorized && user) {
        return (
            <>
                <div className="max-w-lg mx-auto px-4 py-20 text-center">
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-10 shadow-sm">
                        <ShieldAlert className="h-16 w-16 text-rose-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
                        <p className="text-gray-500 dark:text-white/40 text-sm">
                            Você não tem permissão para acessar o módulo financeiro.
                        </p>
                        <p className="text-gray-400 dark:text-white/30 text-xs mt-2">
                            Solicite ao administrador que cadastre seu email (<strong>{user.email}</strong>) na lista de funcionários autorizados.
                        </p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançamentos PixPag</h1>
                        <p className="text-sm text-gray-500 dark:text-white/40">Lançamentos PixPag Gestão financeira e lançamentos</p>
                    </div>
                    <div className="flex items-center gap-3">

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
                        <Button
                            onClick={() => setIsBatchOCROpen(true)}
                            variant="outline"
                            className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/10 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 gap-2"
                        >
                            <Sparkles className="h-4 w-4" /> Importar Lote (IA)
                        </Button>
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
                            <p className="text-xs text-gray-500 mt-1">Excluindo cancelados/rejeitados</p>
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
                                R$ {(stats.rejected + stats.cancelled).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Títulos não compensados</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & List */}
                <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-white/[0.05] space-y-3">
                        {/* Row 1: Quick Date Filter Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { key: 'today', label: 'Hoje' },
                                { key: 'yesterday', label: 'Ontem' },
                                { key: '7days', label: '7 Dias' },
                                { key: 'month', label: 'Mês' },
                                { key: 'year', label: 'Ano' },
                                { key: 'custom', label: 'Personalizado' },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => {
                                        setQuickDateFilter(opt.key);
                                        const today = new Date();
                                        switch (opt.key) {
                                            case 'today':
                                                setDateStart(format(startOfDay(today), 'yyyy-MM-dd'));
                                                setDateEnd(format(endOfDay(today), 'yyyy-MM-dd'));
                                                break;
                                            case 'yesterday': {
                                                const yesterday = subDays(today, 1);
                                                setDateStart(format(startOfDay(yesterday), 'yyyy-MM-dd'));
                                                setDateEnd(format(endOfDay(yesterday), 'yyyy-MM-dd'));
                                                break;
                                            }
                                            case '7days':
                                                setDateStart(format(subDays(today, 7), 'yyyy-MM-dd'));
                                                setDateEnd(format(endOfDay(today), 'yyyy-MM-dd'));
                                                break;
                                            case 'month':
                                                setDateStart(format(startOfMonth(today), 'yyyy-MM-dd'));
                                                setDateEnd(format(endOfMonth(today), 'yyyy-MM-dd'));
                                                break;
                                            case 'year':
                                                setDateStart(format(startOfYear(today), 'yyyy-MM-dd'));
                                                setDateEnd(format(endOfYear(today), 'yyyy-MM-dd'));
                                                break;
                                            case 'custom':
                                                break;
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${quickDateFilter === opt.key
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Row 2: Filter Controls */}
                        <div className={`grid gap-3 items-end ${quickDateFilter === 'custom' ? 'grid-cols-2 md:grid-cols-7' : 'grid-cols-2 md:grid-cols-4'}`}>
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">Centro de Distribuição</span>
                                <DistributionCenterSelect
                                    value={selectedCD}
                                    onChange={setSelectedCD}
                                    placeholder="Todos os CDs"
                                />
                            </div>
                            {quickDateFilter === 'custom' && (
                                <>
                                    <div>
                                        <span className="text-xs text-gray-500 mb-1 block">Início</span>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal h-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                                    {format(new Date(dateStart + 'T12:00:00'), 'dd/MM/yyyy')}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarPicker
                                                    mode="single"
                                                    selected={new Date(dateStart + 'T12:00:00')}
                                                    onSelect={(date) => { if (date) setDateStart(format(date, 'yyyy-MM-dd')); }}
                                                    locale={ptBR}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 mb-1 block">Fim</span>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal h-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                                    {format(new Date(dateEnd + 'T12:00:00'), 'dd/MM/yyyy')}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarPicker
                                                    mode="single"
                                                    selected={new Date(dateEnd + 'T12:00:00')}
                                                    onSelect={(date) => { if (date) setDateEnd(format(date, 'yyyy-MM-dd')); }}
                                                    locale={ptBR}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </>
                            )}
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">Tipo</span>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="h-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
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
                                    <SelectTrigger className="h-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
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
                            <div className={quickDateFilter === 'custom' ? 'col-span-2' : ''}>
                                <span className="text-xs text-gray-500 mb-1 block">Busca</span>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar cliente..."
                                        className="pl-9 h-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
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
                                    <th className="px-6 py-3">Registrado por</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Carregando registros...</td></tr>
                                ) : filteredRecords?.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                                ) : filteredRecords?.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                                            {format(new Date(record.transaction_date + 'T12:00:00'), 'dd/MM/yyyy')}
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
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                                    {(userNameMap.get(record.user_id) || userNameMap.get(record.created_by_email) || record.created_by_email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs text-gray-600 dark:text-white/60 truncate max-w-[120px]" title={record.created_by_email}>
                                                    {userNameMap.get(record.user_id) || userNameMap.get(record.created_by_email) || record.created_by_email || 'Usuário'}
                                                </span>
                                            </div>
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

                                                {/* Cancel / Delete (Soft) - Admin only */}
                                                {isAdmin && (record.status === 'pending') && (
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

            <ManageUsersDialog
                open={isManageUsersOpen}
                onOpenChange={setIsManageUsersOpen}
            />
            <BatchOCRDialog
                open={isBatchOCROpen}
                onOpenChange={setIsBatchOCROpen}
                onSuccess={refetch}
            />
        </>
    );
}
