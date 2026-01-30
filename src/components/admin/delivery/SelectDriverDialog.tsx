import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Truck, User, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SelectDriverDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectDriver: (driverId: string) => void;
    isAssigning: boolean;
}

export function SelectDriverDialog({ open, onOpenChange, onSelectDriver, isAssigning }: SelectDriverDialogProps) {
    const { data: drivers, isLoading } = useDeliveryDrivers();
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

    // Filtra apenas entregadores disponíveis
    const availableDrivers = drivers?.filter(d => d.status === 'disponivel' && d.active) || [];

    const handleConfirm = () => {
        if (selectedDriverId) {
            onSelectDriver(selectedDriverId);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Selecionar Entregador</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : availableDrivers.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground border rounded-lg bg-muted/50">
                            <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhum entregador disponível no momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {availableDrivers.map((driver) => (
                                <div
                                    key={driver.id}
                                    onClick={() => setSelectedDriverId(driver.id)}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent ${selectedDriverId === driver.id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{driver.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                                    {driver.rating?.toFixed(1) || '5.0'}
                                                </span>
                                                <span>•</span>
                                                <span>{driver.total_deliveries || 0} entregas</span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedDriverId === driver.id && (
                                        <Badge className="bg-primary">Selecionado</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedDriverId || isAssigning}
                        className="bg-primary text-white"
                    >
                        {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirmar e Despachar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
