
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Lock, CreditCard, Smartphone, Globe } from 'lucide-react';
import { usePdvCashRegister } from '@/hooks/pdv/usePdvCashRegister';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function Caixa() {
    const { currentRegister, isLoadingRegister, movements, salesSummary, openRegister, closeRegister, addMovement } = usePdvCashRegister();

    const [openingAmount, setOpeningAmount] = useState('');
    const [closingAmount, setClosingAmount] = useState('');
    const [movementAmount, setMovementAmount] = useState('');
    const [movementReason, setMovementReason] = useState('');
    const [movementType, setMovementType] = useState<'sangria' | 'suprimento' | null>(null);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const [isCloseOpen, setIsCloseOpen] = useState(false);

    // Closing payment fields
    const [closingFields, setClosingFields] = useState({
        credit_moderninha: '',
        debit_moderninha: '',
        pix_moderninha: '',
        credit_cielo: '',
        debit_cielo: '',
        pix_cielo: '',
        online: '',
    });
    const setField = (key: string, val: string) =>
        setClosingFields(prev => ({ ...prev, [key]: val }));

    // Calculations
    const opening = currentRegister ? Number(currentRegister.opening_amount) : 0;
    const totalSales = salesSummary?.total || 0;
    const totalSupply = movements?.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + Number(m.amount), 0) || 0;
    const totalBleed = movements?.filter(m => m.type === 'sangria').reduce((acc, m) => acc + Number(m.amount), 0) || 0;

    const currentBalance = opening + totalSales + totalSupply - totalBleed;

    const handleOpenRegister = () => {
        const amount = parseFloat(openingAmount);
        if (isNaN(amount)) {
            toast.error("Valor inválido");
            return;
        }
        openRegister.mutate(amount);
    };

    const handleMovement = () => {
        const amount = parseFloat(movementAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Valor inválido");
            return;
        }
        if (!movementType) return;
        if (!movementReason) {
            toast.error("Motivo é obrigatório");
            return;
        }

        addMovement.mutate({ type: movementType, amount, reason: movementReason }, {
            onSuccess: () => {
                setIsMovementOpen(false);
                setMovementAmount('');
                setMovementReason('');
                setMovementType(null);
            }
        });
    };

    const handleCloseRegister = () => {
        const amount = parseFloat(closingAmount);
        if (isNaN(amount)) {
            toast.error("Informe o valor em dinheiro na gaveta");
            return;
        }
        const paymentNotes = JSON.stringify({
            dinheiro: amount,
            ...Object.fromEntries(
                Object.entries(closingFields).map(([k, v]) => [k, parseFloat(v) || 0])
            )
        });
        closeRegister.mutate({ closingAmount: amount, notes: paymentNotes }, {
            onSuccess: () => {
                setIsCloseOpen(false);
                setClosingAmount('');
                setClosingFields({ credit_moderninha: '', debit_moderninha: '', pix_moderninha: '', credit_cielo: '', debit_cielo: '', pix_cielo: '', online: '' });
            }
        });
    };

    if (isLoadingRegister) {
        return <div className="flex items-center justify-center h-96">Carregando status do caixa...</div>;
    }

    const isOpen = !!currentRegister;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-lg shadow-sm border">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-primary" />
                        Controle de Caixa
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {isOpen
                            ? `Caixa aberto em ${new Date(currentRegister.opened_at).toLocaleTimeString()}`
                            : "Caixa fechado. Inicie o turno para operar."
                        }
                    </p>
                </div>
                <div className="text-right">
                    <Badge variant={isOpen ? "default" : "destructive"} className="text-lg px-4 py-1 mb-2">
                        {isOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                    </Badge>
                    <div className="font-mono text-xl">Saldo Atual: R$ {currentBalance.toFixed(2)}</div>
                </div>
            </div>

            {isOpen ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas (Dinheiro)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center text-green-600">
                                + R$ {totalSales.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {salesSummary?.count || 0} vendas hoje
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Suprimentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">+ R$ {totalSupply.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                {movements?.filter(m => m.type === 'suprimento').length || 0} entradas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sangrias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">- R$ {totalBleed.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <ArrowDownLeft className="h-3 w-3 mr-1" />
                                {movements?.filter(m => m.type === 'sangria').length || 0} saídas
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-primary">Saldo Estimado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary">R$ {currentBalance.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Baseado nas movimentações</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="max-w-md mx-auto mt-10 border-2 border-dashed">
                    <CardHeader>
                        <CardTitle>Abertura de Caixa</CardTitle>
                        <CardDescription>Informe o valor inicial (Fundo de Troco) para abrir o caixa.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="opening-amount">Fundo de Caixa (R$)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                                <Input
                                    id="opening-amount"
                                    type="number"
                                    className="pl-9 text-lg font-bold"
                                    placeholder="0.00"
                                    value={openingAmount}
                                    onChange={e => setOpeningAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="w-full gap-2" size="lg" onClick={handleOpenRegister} disabled={openRegister.isPending}>
                            <Lock className="h-4 w-4" />
                            {openRegister.isPending ? 'Abrindo...' : 'Abrir Caixa'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Movimentações Rápidas</CardTitle>
                            <CardDescription>Registre entradas ou saídas manuais de dinheiro.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                    onClick={() => {
                                        setMovementType('suprimento');
                                        setIsMovementOpen(true);
                                    }}
                                >
                                    <ArrowUpRight className="h-8 w-8 text-green-500" />
                                    <span className="font-semibold">Suprimento</span>
                                    <span className="text-xs text-muted-foreground text-center">Entrada de troco/dinheiro</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                    onClick={() => {
                                        setMovementType('sangria');
                                        setIsMovementOpen(true);
                                    }}
                                >
                                    <ArrowDownLeft className="h-8 w-8 text-red-500" />
                                    <span className="font-semibold">Sangria</span>
                                    <span className="text-xs text-muted-foreground text-center">Retirada para pagamentos</span>
                                </Button>
                            </div>

                            <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full h-12 text-lg mt-4 font-bold flex items-center justify-center gap-2">
                                        <Lock className="h-5 w-5" />
                                        Fechar Caixa
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Fechamento de Caixa</DialogTitle>
                                        <DialogDescription>
                                            Informe os valores físicos de cada forma de pagamento.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-2 space-y-5">
                                        {/* Dinheiro */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-bold text-green-700">
                                                <Wallet className="h-4 w-4" /> Dinheiro
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                                <span>Sistema: <b>R$ {(salesSummary?.byMethod?.['money'] || 0).toFixed(2)}</b></span>
                                                <span>Esperado em caixa: <b>R$ {currentBalance.toFixed(2)}</b></span>
                                            </div>
                                            <Input type="number" placeholder="Valor contado na gaveta (R$)" value={closingAmount} onChange={e => setClosingAmount(e.target.value)} />
                                        </div>

                                        <hr />

                                        {/* Moderninha */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                                                <CreditCard className="h-4 w-4" /> Moderninha
                                            </div>
                                            {[
                                                { key: 'credit_moderninha', label: 'Crédito Moderninha' },
                                                { key: 'debit_moderninha', label: 'Débito Moderninha' },
                                                { key: 'pix_moderninha', label: 'Pix Moderninha' },
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center gap-3">
                                                    <Label className="w-44 text-xs shrink-0">{label}</Label>
                                                    <div className="text-xs text-muted-foreground w-24 shrink-0">
                                                        Sistema: <b>R$ {((salesSummary as any)?.byMethod?.[key] || 0).toFixed(2)}</b>
                                                    </div>
                                                    <Input type="number" placeholder="0.00" className="h-8 text-sm"
                                                        value={(closingFields as any)[key]}
                                                        onChange={e => setField(key, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>

                                        <hr />

                                        {/* Cielo */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                                                <CreditCard className="h-4 w-4" /> Cielo
                                            </div>
                                            {[
                                                { key: 'credit_cielo', label: 'Crédito Cielo' },
                                                { key: 'debit_cielo', label: 'Débito Cielo' },
                                                { key: 'pix_cielo', label: 'Pix Cielo' },
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center gap-3">
                                                    <Label className="w-44 text-xs shrink-0">{label}</Label>
                                                    <div className="text-xs text-muted-foreground w-24 shrink-0">
                                                        Sistema: <b>R$ {((salesSummary as any)?.byMethod?.[key] || 0).toFixed(2)}</b>
                                                    </div>
                                                    <Input type="number" placeholder="0.00" className="h-8 text-sm"
                                                        value={(closingFields as any)[key]}
                                                        onChange={e => setField(key, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>

                                        <hr />

                                        {/* Online */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm font-bold text-purple-700">
                                                <Globe className="h-4 w-4" /> Pagamento Online
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Label className="w-44 text-xs shrink-0">Pagamento Online</Label>
                                                <div className="text-xs text-muted-foreground w-24 shrink-0">
                                                    Sistema: <b>R$ {((salesSummary as any)?.byMethod?.['online'] || 0).toFixed(2)}</b>
                                                </div>
                                                <Input type="number" placeholder="0.00" className="h-8 text-sm"
                                                    value={closingFields.online}
                                                    onChange={e => setField('online', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsCloseOpen(false)}>Cancelar</Button>
                                        <Button variant="destructive" onClick={handleCloseRegister} disabled={closeRegister.isPending}>
                                            {closeRegister.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>Histórico do Turno</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto max-h-[300px]">
                            <div className="space-y-4">
                                {movements?.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">Nenhuma movimentação manual.</p>
                                )}
                                {movements?.map((mov) => (
                                    <div key={mov.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                        <div>
                                            <p className="font-medium text-sm flex items-center gap-2">
                                                {mov.type === 'suprimento' ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-200">Suprimento</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-600 border-red-200">Sangria</Badge>
                                                )}
                                                <span className="text-muted-foreground text-xs">{new Date(mov.created_at).toLocaleTimeString()}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">{mov.reason}</p>
                                        </div>
                                        <span className={`font-mono font-bold ${mov.type === 'suprimento' ? 'text-green-600' : 'text-red-600'}`}>
                                            {mov.type === 'suprimento' ? '+' : '-'} R$ {Number(mov.amount).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Movement Dialog */}
            <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {movementType === 'suprimento' ? 'Registrar Suprimento' : 'Registrar Sangria'}
                        </DialogTitle>
                        <DialogDescription>
                            {movementType === 'suprimento'
                                ? 'Adicionar dinheiro ao caixa (troco, aporte).'
                                : 'Retirar dinheiro do caixa (pagamentos, recolhimento).'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Valor (R$)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={movementAmount}
                                onChange={e => setMovementAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo / Observação</Label>
                            <Input
                                placeholder={movementType === 'suprimento' ? "Ex: Troco inicial" : "Ex: Pagamento fornecedor"}
                                value={movementReason}
                                onChange={e => setMovementReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMovementOpen(false)}>Cancelar</Button>
                        <Button onClick={handleMovement} disabled={addMovement.isPending}>
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
