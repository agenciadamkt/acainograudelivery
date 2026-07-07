
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Lock,
    CreditCard, Globe, ShoppingBag, Bike,
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePdvCashRegister } from '@/hooks/pdv/usePdvCashRegister';

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

const PDV_METHOD_LABEL: Record<string, string> = {
    money: 'Dinheiro',
    credit: 'Crédito',
    debit: 'Débito',
    pix: 'PIX',
    credit_moderninha: 'Crédito Moderninha',
    debit_moderninha: 'Débito Moderninha',
    pix_moderninha: 'PIX Moderninha',
    credit_cielo: 'Crédito Cielo',
    debit_cielo: 'Débito Cielo',
    pix_cielo: 'PIX Cielo',
    online: 'Online',
};

const DELIVERY_METHOD_LABEL: Record<string, string> = {
    dinheiro: 'Dinheiro',
    credit_card: 'Crédito',
    debit_card: 'Débito',
    pix: 'PIX',
    online: 'Online',
};

// ── component ──────────────────────────────────────────────────────────────────
export default function Caixa() {
    const {
        currentRegister, isLoadingRegister,
        movements, salesSummary, deliverySummary,
        openRegister, closeRegister, addMovement,
    } = usePdvCashRegister();

    const [openingAmount, setOpeningAmount]     = useState('');
    const [closingCash, setClosingCash]         = useState('');
    const [movementAmount, setMovementAmount]   = useState('');
    const [movementReason, setMovementReason]   = useState('');
    const [movementType, setMovementType]       = useState<'sangria' | 'suprimento' | null>(null);
    const [isMovementOpen, setIsMovementOpen]   = useState(false);
    const [isCloseOpen, setIsCloseOpen]         = useState(false);

    // Extra closing fields (machines)
    const [closingFields, setClosingFields] = useState({
        credit_moderninha: '', debit_moderninha: '', pix_moderninha: '',
        credit_cielo: '',      debit_cielo: '',      pix_cielo: '',
        online: '',
    });
    const setField = (key: string, val: string) =>
        setClosingFields(prev => ({ ...prev, [key]: val }));

    // ── derived values ────────────────────────────────────────────────────────
    const opening      = currentRegister ? Number(currentRegister.opening_amount) : 0;
    const totalSupply  = (movements || []).filter(m => m.type === 'suprimento').reduce((s, m) => s + Number(m.amount), 0);
    const totalBleed   = (movements || []).filter(m => m.type === 'sangria').reduce((s, m) => s + Number(m.amount), 0);

    // Physical cash balance (only cash payments affect the drawer)
    const cashBalance  = opening + salesSummary.moneyTotal + deliverySummary.moneyTotal + totalSupply - totalBleed;
    // Grand total revenue (all methods, both channels)
    const grandTotal   = salesSummary.total + deliverySummary.total;

    // ── handlers ──────────────────────────────────────────────────────────────
    const handleOpen = () => {
        const amount = parseFloat(openingAmount);
        if (isNaN(amount)) { toast.error('Valor inválido'); return; }
        openRegister.mutate(amount);
    };

    const handleMovement = () => {
        const amount = parseFloat(movementAmount);
        if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }
        if (!movementType) return;
        if (!movementReason.trim()) { toast.error('Motivo é obrigatório'); return; }
        addMovement.mutate({ type: movementType, amount, reason: movementReason }, {
            onSuccess: () => {
                setIsMovementOpen(false);
                setMovementAmount('');
                setMovementReason('');
                setMovementType(null);
            },
        });
    };

    const handleClose = () => {
        const amount = parseFloat(closingCash);
        if (isNaN(amount)) { toast.error('Informe o valor em dinheiro na gaveta'); return; }
        const notes = JSON.stringify({
            dinheiro: amount,
            ...Object.fromEntries(Object.entries(closingFields).map(([k, v]) => [k, parseFloat(v) || 0])),
        });
        closeRegister.mutate({ closingAmount: amount, notes }, {
            onSuccess: () => {
                setIsCloseOpen(false);
                setClosingCash('');
                setClosingFields({
                    credit_moderninha: '', debit_moderninha: '', pix_moderninha: '',
                    credit_cielo: '',      debit_cielo: '',      pix_cielo: '',
                    online: '',
                });
            },
        });
    };

    if (isLoadingRegister) {
        return <div className="flex items-center justify-center h-96 text-muted-foreground">Carregando caixa...</div>;
    }

    const isOpen = !!currentRegister;

    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex justify-between items-center bg-card p-6 rounded-lg shadow-sm border">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-primary" />
                        Caixa Unificado
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {isOpen
                            ? `Aberto às ${new Date(currentRegister.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · PDV + Delivery consolidados`
                            : 'Caixa fechado. Inicie o turno para operar.'}
                    </p>
                </div>
                <div className="text-right space-y-1">
                    <Badge variant={isOpen ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                        {isOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                    </Badge>
                    {isOpen && (
                        <div className="font-mono text-sm text-muted-foreground">
                            Dinheiro em caixa: <span className="font-bold text-foreground">{fmt(cashBalance)}</span>
                        </div>
                    )}
                </div>
            </div>

            {isOpen ? (
                <>
                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                        {/* PDV */}
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <ShoppingBag className="h-3 w-3" /> Vendas PDV
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="text-2xl font-bold text-blue-600">{fmt(salesSummary.total)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {salesSummary.count} {salesSummary.count === 1 ? 'venda' : 'vendas'}
                                    {salesSummary.count > 0 && ` · TM ${fmt(salesSummary.total / salesSummary.count)}`}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Delivery */}
                        <Card className="border-l-4 border-l-orange-500">
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Bike className="h-3 w-3" /> Vendas Delivery
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="text-2xl font-bold text-orange-500">{fmt(deliverySummary.total)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {deliverySummary.count} {deliverySummary.count === 1 ? 'pedido' : 'pedidos'}
                                    {deliverySummary.count > 0 && ` · TM ${fmt(deliverySummary.total / deliverySummary.count)}`}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Suprimentos / Sangrias */}
                        <Card>
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Movimentações</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />Suprimento</span>
                                    <span className="font-medium text-green-600">{fmt(totalSupply)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-600 flex items-center gap-1"><ArrowDownLeft className="h-3 w-3" />Sangria</span>
                                    <span className="font-medium text-red-600">{fmt(totalBleed)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Grand Total */}
                        <Card className="bg-primary/5 border-primary/30">
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-xs font-medium text-primary flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> Faturamento Total
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="text-2xl font-bold text-primary">{fmt(grandTotal)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {salesSummary.count + deliverySummary.count} vendas no turno
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Payment breakdown ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* PDV by method */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4 text-blue-500" /> PDV — Por forma de pagamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(salesSummary.byMethod).length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Sem vendas PDV neste turno.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(salesSummary.byMethod).map(([method, amount]) => (
                                            <div key={method} className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">{PDV_METHOD_LABEL[method] || method}</span>
                                                <span className="font-medium">{fmt(amount)}</span>
                                            </div>
                                        ))}
                                        <Separator />
                                        <div className="flex justify-between text-sm font-bold">
                                            <span>Total PDV</span>
                                            <span className="text-blue-600">{fmt(salesSummary.total)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Delivery by method */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Bike className="h-4 w-4 text-orange-500" /> Delivery — Por forma de pagamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(deliverySummary.byMethod).length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Sem pedidos delivery neste turno.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(deliverySummary.byMethod).map(([method, amount]) => (
                                            <div key={method} className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">{DELIVERY_METHOD_LABEL[method] || method}</span>
                                                <span className="font-medium">{fmt(amount)}</span>
                                            </div>
                                        ))}
                                        <Separator />
                                        <div className="flex justify-between text-sm font-bold">
                                            <span>Total Delivery</span>
                                            <span className="text-orange-500">{fmt(deliverySummary.total)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Actions + Movements ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Movimentações Manuais</CardTitle>
                                <CardDescription>Suprimento ou sangria de caixa.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" className="h-20 flex flex-col gap-1 border-green-200 hover:bg-green-50 hover:text-green-700"
                                        onClick={() => { setMovementType('suprimento'); setIsMovementOpen(true); }}>
                                        <ArrowUpRight className="h-6 w-6 text-green-500" />
                                        <span className="font-semibold text-sm">Suprimento</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-1 border-red-200 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => { setMovementType('sangria'); setIsMovementOpen(true); }}>
                                        <ArrowDownLeft className="h-6 w-6 text-red-500" />
                                        <span className="font-semibold text-sm">Sangria</span>
                                    </Button>
                                </div>

                                {/* Close register */}
                                <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" className="w-full h-12 text-base font-bold flex items-center justify-center gap-2 mt-2">
                                            <Lock className="h-4 w-4" /> Fechar Caixa
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Fechamento de Caixa</DialogTitle>
                                            <DialogDescription>
                                                Informe os valores físicos por forma de pagamento para conferência.
                                            </DialogDescription>
                                        </DialogHeader>

                                        {/* Closing summary */}
                                        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                                            <div className="flex justify-between font-medium">
                                                <span>Total PDV</span>
                                                <span className="text-blue-600">{fmt(salesSummary.total)}</span>
                                            </div>
                                            <div className="flex justify-between font-medium">
                                                <span>Total Delivery</span>
                                                <span className="text-orange-500">{fmt(deliverySummary.total)}</span>
                                            </div>
                                            <Separator className="my-1" />
                                            <div className="flex justify-between font-bold">
                                                <span>Faturamento Total</span>
                                                <span>{fmt(grandTotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground text-xs pt-1">
                                                <span>Dinheiro esperado na gaveta</span>
                                                <span>{fmt(cashBalance)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Dinheiro */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-bold text-green-700">
                                                    <Wallet className="h-4 w-4" /> Dinheiro contado na gaveta
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                                    <span>PDV: <b>{fmt(salesSummary.byMethod['money'] || 0)}</b></span>
                                                    <span>Delivery: <b>{fmt(deliverySummary.byMethod['dinheiro'] || 0)}</b></span>
                                                    <span>Esperado: <b>{fmt(cashBalance)}</b></span>
                                                </div>
                                                <Input type="number" placeholder="Valor contado (R$)" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
                                            </div>

                                            <Separator />

                                            {/* Moderninha */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                                                    <CreditCard className="h-4 w-4" /> Moderninha
                                                </div>
                                                {(['credit_moderninha', 'debit_moderninha', 'pix_moderninha'] as const).map(key => (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <Label className="w-40 text-xs shrink-0">{PDV_METHOD_LABEL[key]}</Label>
                                                        <span className="text-xs text-muted-foreground w-20 shrink-0">
                                                            Sist.: <b>{fmt(salesSummary.byMethod[key] || 0)}</b>
                                                        </span>
                                                        <Input type="number" placeholder="0.00" className="h-8 text-sm"
                                                            value={(closingFields as any)[key]}
                                                            onChange={e => setField(key, e.target.value)} />
                                                    </div>
                                                ))}
                                            </div>

                                            <Separator />

                                            {/* Cielo */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                                                    <CreditCard className="h-4 w-4" /> Cielo
                                                </div>
                                                {(['credit_cielo', 'debit_cielo', 'pix_cielo'] as const).map(key => (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <Label className="w-40 text-xs shrink-0">{PDV_METHOD_LABEL[key]}</Label>
                                                        <span className="text-xs text-muted-foreground w-20 shrink-0">
                                                            Sist.: <b>{fmt(salesSummary.byMethod[key] || 0)}</b>
                                                        </span>
                                                        <Input type="number" placeholder="0.00" className="h-8 text-sm"
                                                            value={(closingFields as any)[key]}
                                                            onChange={e => setField(key, e.target.value)} />
                                                    </div>
                                                ))}
                                            </div>

                                            <Separator />

                                            {/* Online / PIX delivery */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-bold text-purple-700">
                                                    <Globe className="h-4 w-4" /> Online / PIX Delivery
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Label className="w-40 text-xs shrink-0">Pagamento Online</Label>
                                                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                                                        PDV: <b>{fmt(salesSummary.byMethod['online'] || 0)}</b>
                                                    </span>
                                                    <Input type="number" placeholder="0.00" className="h-8 text-sm"
                                                        value={closingFields.online}
                                                        onChange={e => setField('online', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsCloseOpen(false)}>Cancelar</Button>
                                            <Button variant="destructive" onClick={handleClose} disabled={closeRegister.isPending}>
                                                {closeRegister.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>

                        {/* Movement history */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico do Turno</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto max-h-72">
                                {(!movements || movements.length === 0) ? (
                                    <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma movimentação manual.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {movements.map(mov => (
                                            <div key={mov.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {mov.type === 'suprimento'
                                                            ? <Badge variant="outline" className="text-green-600 border-green-200">Suprimento</Badge>
                                                            : <Badge variant="outline" className="text-red-600 border-red-200">Sangria</Badge>}
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">{mov.reason}</p>
                                                </div>
                                                <span className={`font-mono font-bold text-sm ${mov.type === 'suprimento' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {mov.type === 'suprimento' ? '+' : '-'} {fmt(Number(mov.amount))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                /* ── Open register form ── */
                <Card className="max-w-md mx-auto mt-10 border-2 border-dashed">
                    <CardHeader>
                        <CardTitle>Abertura de Caixa</CardTitle>
                        <CardDescription>Informe o fundo de troco para iniciar o turno.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="opening-amount">Fundo de Caixa (R$)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                                <Input id="opening-amount" type="number" className="pl-9 text-lg font-bold"
                                    placeholder="0.00" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} />
                            </div>
                        </div>
                        <Button className="w-full gap-2" size="lg" onClick={handleOpen} disabled={openRegister.isPending}>
                            <Lock className="h-4 w-4" />
                            {openRegister.isPending ? 'Abrindo...' : 'Abrir Caixa'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Movement dialog */}
            <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {movementType === 'suprimento' ? 'Registrar Suprimento' : 'Registrar Sangria'}
                        </DialogTitle>
                        <DialogDescription>
                            {movementType === 'suprimento'
                                ? 'Entrada de dinheiro no caixa (troco, aporte).'
                                : 'Retirada de dinheiro do caixa (pagamentos, recolhimento).'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Valor (R$)</Label>
                            <Input type="number" placeholder="0.00" value={movementAmount}
                                onChange={e => setMovementAmount(e.target.value)} autoFocus />
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo / Observação</Label>
                            <Input placeholder={movementType === 'suprimento' ? 'Ex: Troco inicial' : 'Ex: Pagamento fornecedor'}
                                value={movementReason} onChange={e => setMovementReason(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMovementOpen(false)}>Cancelar</Button>
                        <Button onClick={handleMovement} disabled={addMovement.isPending}>Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
