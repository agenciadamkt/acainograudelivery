'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Wallet, Landmark, PiggyBank } from 'lucide-react';

interface AccountSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function AccountSelect({ value, onChange, placeholder = "Selecionar conta..." }: AccountSelectProps) {
    const { data: accounts, isLoading } = useQuery({
        queryKey: ['financial_accounts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('financial_accounts' as any)
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'bank': return <Landmark className="h-3.5 w-3.5" />;
            case 'reserve': return <PiggyBank className="h-3.5 w-3.5" />;
            default: return <Wallet className="h-3.5 w-3.5" />;
        }
    };

    return (
        <Select value={value} onValueChange={onChange} disabled={isLoading}>
            <SelectTrigger className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 h-10">
                <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                            {getIcon(account.type)}
                            <span>{account.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
