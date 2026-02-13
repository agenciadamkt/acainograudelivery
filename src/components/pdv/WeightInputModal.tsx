import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale } from 'lucide-react';

interface WeightInputModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: {
        id: string;
        name: string;
        sale_price: number;
        unit?: string;
    };
    onConfirm: (data: {
        product: any;
        weight: number;
        unitPrice: number;
        totalPrice: number;
    }) => void;
}

export function WeightInputModal({
    open,
    onOpenChange,
    product,
    onConfirm
}: WeightInputModalProps) {
    const [weight, setWeight] = useState<string>('');

    // Reset weight when modal opens
    useEffect(() => {
        if (open) {
            setWeight('');
        }
    }, [open]);

    const weightNum = parseFloat(weight) || 0;
    const totalPrice = weightNum * product.sale_price;

    const handleConfirm = () => {
        if (weightNum <= 0) return;

        onConfirm({
            product,
            weight: weightNum,
            unitPrice: product.sale_price,
            totalPrice
        });
        onOpenChange(false);
    };

    const handleWeightChange = (value: string) => {
        // Allow only numbers and decimal point
        const cleaned = value.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = cleaned.split('.');
        if (parts.length > 2) return;
        setWeight(cleaned);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Informar Peso
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Product Info */}
                    <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            R$ {product.sale_price.toFixed(2)} / {product.unit || 'kg'}
                        </p>
                    </div>

                    {/* Weight Input */}
                    <div className="space-y-2">
                        <Label htmlFor="weight" className="text-muted-foreground">
                            Peso (kg)
                        </Label>
                        <Input
                            id="weight"
                            type="text"
                            inputMode="decimal"
                            value={weight}
                            onChange={(e) => handleWeightChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleConfirm();
                                }
                            }}
                            placeholder="Ex: 0.500"
                            className="h-12 text-center text-lg font-medium"
                            autoFocus
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-primary/10 rounded-lg p-4 text-center space-y-1">
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <p className="text-2xl font-bold text-primary">
                            R$ {totalPrice.toFixed(2)}
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 sm:flex-none"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={weightNum <= 0}
                        className="flex-1 sm:flex-none"
                    >
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
