'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

/* ── Helpers ── */

/** Convert a number to BRL display string: 1500.5 → "1.500,50" */
function numberToBRL(value: number): string {
    if (!value && value !== 0) return '';
    if (value === 0) return '';
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/** Convert a BRL display string to a number: "1.500,50" → 1500.5 */
function brlToNumber(brl: string): number {
    if (!brl) return 0;
    // Remove thousands separator (.) and replace decimal separator (,) with (.)
    const cleaned = brl.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/* ── Component ── */

interface CurrencyInputProps {
    /** Numeric value (e.g. 1500.50) */
    value: number;
    /** Callback with numeric value */
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export default function CurrencyInput({
    value,
    onChange,
    placeholder = '0,00',
    className = '',
    readOnly = false,
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    // Sync display when the external numeric value changes (e.g. form reset / edit load)
    useEffect(() => {
        setDisplayValue(numberToBRL(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only digits, comma and dot
        const raw = e.target.value.replace(/[^\d.,]/g, '');
        setDisplayValue(raw);
    };

    const handleBlur = () => {
        const num = brlToNumber(displayValue);
        onChange(num);
        setDisplayValue(numberToBRL(num));
    };

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                R$
            </span>
            <Input
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                className={`pl-9 ${className}`}
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                readOnly={readOnly}
            />
        </div>
    );
}
