import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Building2,
    Shield,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    FileCheck,
    CreditCard,
    Search,
    RefreshCw,
    Eye,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { displayCNPJ } from '@/services/b2bCompliance';

interface DriverComplianceData {
    id: string;
    name: string;
    phone: string;
    cnpj: string | null;
    razao_social: string | null;
    mei_status: string;
    cnae_principal: string | null;
    cnae_compatible: boolean;
    cnae_warning: string | null;
    b2b_terms_accepted: boolean;
    b2b_terms_version: string | null;
    b2b_terms_accepted_at: string | null;
    pj_bank_account: any;
    created_at: string;
}

export default function AdminComplianceDashboard() {
    const [drivers, setDrivers] = useState<DriverComplianceData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'pending' | 'divergent' | 'rejected'>('all');
    const [selectedDriver, setSelectedDriver] = useState<DriverComplianceData | null>(null);

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from('delivery_drivers' as any)
            .select(`
        id, name, phone, cnpj, razao_social, mei_status,
        cnae_principal, cnae_compatible, cnae_warning,
        b2b_terms_accepted, b2b_terms_version, b2b_terms_accepted_at,
        pj_bank_account, created_at
      `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching drivers:', error);
        } else {
            setDrivers((data as unknown as DriverComplianceData[]) || []);
        }

        setIsLoading(false);
    };

    const getComplianceStatus = (driver: DriverComplianceData) => {
        if (driver.mei_status === 'rejected') return 'rejected';
        if (driver.mei_status === 'divergent') return 'divergent';

        const isCompliant =
            driver.cnpj &&
            driver.mei_status === 'active' &&
            driver.b2b_terms_accepted &&
            driver.pj_bank_account;

        return isCompliant ? 'compliant' : 'pending';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'compliant':
                return <Badge className="bg-green-500 gap-1"><ShieldCheck className="w-3 h-3" /> Compliant</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500 gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
            case 'divergent':
                return <Badge className="bg-orange-500 gap-1"><ShieldAlert className="w-3 h-3" /> Divergente</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500 gap-1"><ShieldX className="w-3 h-3" /> Rejeitado</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const status = getComplianceStatus(driver);
        const matchesSearch =
            driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.cnpj?.includes(searchTerm) ||
            driver.razao_social?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'all' || status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    // Estatísticas
    const stats = {
        total: drivers.length,
        compliant: drivers.filter(d => getComplianceStatus(d) === 'compliant').length,
        pending: drivers.filter(d => getComplianceStatus(d) === 'pending').length,
        divergent: drivers.filter(d => getComplianceStatus(d) === 'divergent').length,
        rejected: drivers.filter(d => getComplianceStatus(d) === 'rejected').length,
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        Compliance B2B - Entregadores
                    </h1>
                    <p className="text-muted-foreground">
                        Monitoramento de status jurídico dos parceiros entregadores
                    </p>
                </div>
                <Button variant="outline" onClick={fetchDrivers}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        filterStatus === 'all' && "ring-2 ring-primary"
                    )}
                    onClick={() => setFilterStatus('all')}
                >
                    <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold">{stats.total}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-green-200",
                        filterStatus === 'compliant' && "ring-2 ring-green-500"
                    )}
                    onClick={() => setFilterStatus('compliant')}
                >
                    <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.compliant}</p>
                        <p className="text-sm text-green-600">Compliant</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-yellow-200",
                        filterStatus === 'pending' && "ring-2 ring-yellow-500"
                    )}
                    onClick={() => setFilterStatus('pending')}
                >
                    <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                        <p className="text-sm text-yellow-600">Pendentes</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-orange-200",
                        filterStatus === 'divergent' && "ring-2 ring-orange-500"
                    )}
                    onClick={() => setFilterStatus('divergent')}
                >
                    <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-orange-600">{stats.divergent}</p>
                        <p className="text-sm text-orange-600">Divergentes</p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-red-200",
                        filterStatus === 'rejected' && "ring-2 ring-red-500"
                    )}
                    onClick={() => setFilterStatus('rejected')}
                >
                    <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                        <p className="text-sm text-red-600">Rejeitados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, CNPJ ou razão social..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Parceiro</TableHead>
                                <TableHead>CNPJ/MEI</TableHead>
                                <TableHead>CNAE</TableHead>
                                <TableHead>Termos B2B</TableHead>
                                <TableHead>Conta PJ</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDrivers.map(driver => {
                                const status = getComplianceStatus(driver);

                                return (
                                    <TableRow key={driver.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{driver.name}</p>
                                                <p className="text-xs text-muted-foreground">{driver.phone}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {driver.cnpj ? (
                                                <div>
                                                    <p className="font-mono text-sm">{displayCNPJ(driver.cnpj)}</p>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                        {driver.razao_social}
                                                    </p>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    Não cadastrado
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {driver.cnae_principal ? (
                                                driver.cnae_compatible ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                )
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {driver.b2b_terms_accepted ? (
                                                <div className="flex items-center gap-1">
                                                    <FileCheck className="w-4 h-4 text-green-500" />
                                                    <span className="text-xs">v{driver.b2b_terms_version}</span>
                                                </div>
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {driver.pj_bank_account ? (
                                                <CreditCard className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(status)}</TableCell>
                                        <TableCell>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedDriver(driver)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-lg">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2">
                                                            <Building2 className="w-5 h-5" />
                                                            Detalhes de Compliance
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            {driver.name}
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    <div className="space-y-4">
                                                        {/* Status Geral */}
                                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                                            <span className="font-medium">Status Geral</span>
                                                            {getStatusBadge(status)}
                                                        </div>

                                                        {/* CNPJ */}
                                                        <div className="p-3 rounded-lg border">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Building2 className="w-4 h-4" />
                                                                <span className="font-medium">CNPJ/MEI</span>
                                                            </div>
                                                            {driver.cnpj ? (
                                                                <div className="space-y-1 text-sm">
                                                                    <p><strong>CNPJ:</strong> {displayCNPJ(driver.cnpj)}</p>
                                                                    <p><strong>Razão Social:</strong> {driver.razao_social}</p>
                                                                    <p><strong>CNAE:</strong> {driver.cnae_principal}</p>
                                                                    <p><strong>Status MEI:</strong> {driver.mei_status}</p>
                                                                    {driver.cnae_warning && (
                                                                        <Alert className="mt-2">
                                                                            <AlertTriangle className="w-4 h-4" />
                                                                            <AlertDescription className="text-xs">
                                                                                {driver.cnae_warning}
                                                                            </AlertDescription>
                                                                        </Alert>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">Não cadastrado</p>
                                                            )}
                                                        </div>

                                                        {/* Termos B2B */}
                                                        <div className="p-3 rounded-lg border">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileCheck className="w-4 h-4" />
                                                                <span className="font-medium">Termos B2B</span>
                                                            </div>
                                                            {driver.b2b_terms_accepted ? (
                                                                <div className="space-y-1 text-sm">
                                                                    <p><strong>Versão:</strong> {driver.b2b_terms_version}</p>
                                                                    <p><strong>Aceito em:</strong> {new Date(driver.b2b_terms_accepted_at!).toLocaleString('pt-BR')}</p>
                                                                    <Button variant="outline" size="sm" className="mt-2">
                                                                        <Download className="w-3 h-3 mr-1" />
                                                                        Baixar PDF
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">Não aceito</p>
                                                            )}
                                                        </div>

                                                        {/* Conta Bancária */}
                                                        <div className="p-3 rounded-lg border">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CreditCard className="w-4 h-4" />
                                                                <span className="font-medium">Conta para Pagamentos</span>
                                                            </div>
                                                            {driver.pj_bank_account ? (
                                                                <div className="space-y-1 text-sm">
                                                                    <p><strong>Banco:</strong> {driver.pj_bank_account.bank_name}</p>
                                                                    <p><strong>Agência:</strong> {driver.pj_bank_account.agency}</p>
                                                                    <p><strong>Conta:</strong> {driver.pj_bank_account.account_number}</p>
                                                                    <p><strong>Titular:</strong> {driver.pj_bank_account.holder_name}</p>
                                                                    <p>
                                                                        <strong>Tipo:</strong>
                                                                        {driver.pj_bank_account.is_pj ? (
                                                                            <Badge className="ml-2 bg-green-500">Conta PJ</Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="ml-2">Conta PF</Badge>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">Não configurada</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {filteredDrivers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhum parceiro encontrado
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
