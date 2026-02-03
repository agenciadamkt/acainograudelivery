import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DollarSign,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    ChevronRight,
    Wallet,
    Zap,
    Star,
    Navigation,
    Flame,
    Trophy,
    Clock,
} from 'lucide-react';
import {
    useDriverStatement,
    useDriverWallet,
    formatCurrency,
    getTransactionTypeLabel,
    getXPTypeLabel,
    getTierConfig,
    WalletTransaction,
} from '@/hooks/useDriverGamification';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GamerStatementProps {
    driverId: string;
}

export default function GamerStatement({ driverId }: GamerStatementProps) {
    const [filter, setFilter] = useState<'all' | 'earnings' | 'xp'>('all');
    const { data: wallet } = useDriverWallet(driverId);
    const { data: transactions = [], isLoading } = useDriverStatement(driverId, 100);

    const formatDate = (dateStr: string) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return 'Hoje';
        if (isYesterday(date)) return 'Ontem';
        return format(date, "d 'de' MMM", { locale: ptBR });
    };

    const formatTime = (dateStr: string) => {
        return format(parseISO(dateStr), 'HH:mm');
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'delivery_earning':
                return <DollarSign className="w-4 h-4 text-green-500" />;
            case 'displacement_bonus':
                return <Navigation className="w-4 h-4 text-blue-500" />;
            case 'streak_bonus':
                return <Flame className="w-4 h-4 text-orange-500" />;
            case 'tip':
                return <Star className="w-4 h-4 text-yellow-500" />;
            case 'withdrawal':
                return <ArrowDownRight className="w-4 h-4 text-red-500" />;
            default:
                return <Wallet className="w-4 h-4 text-muted-foreground" />;
        }
    };

    // Agrupar transações por data
    const groupedTransactions = transactions.reduce((groups, tx) => {
        const date = formatDate(tx.transaction_date);
        if (!groups[date]) groups[date] = [];
        groups[date].push(tx);
        return groups;
    }, {} as Record<string, WalletTransaction[]>);

    // Calcular totais do dia atual
    const todayTransactions = transactions.filter(tx => isToday(parseISO(tx.transaction_date)));
    const todayEarnings = todayTransactions.reduce((sum, tx) =>
        tx.amount > 0 ? sum + tx.amount : sum, 0
    );
    const todayXP = todayTransactions.reduce((sum, tx) => sum + tx.xp_earned, 0);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-12 rounded-lg" />
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <Badge variant="outline" className="text-xs bg-white/50">Hoje</Badge>
                        </div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {formatCurrency(todayEarnings)}
                        </p>
                        <p className="text-xs text-green-600/70">
                            {todayTransactions.length} entrega(s)
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            <Badge variant="outline" className="text-xs bg-white/50">Hoje</Badge>
                        </div>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                            +{todayXP} XP
                        </p>
                        <p className="text-xs text-purple-600/70">
                            Total: {wallet?.current_xp || 0} XP
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Total Balance */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                            <p className="text-3xl font-bold">
                                {formatCurrency(wallet?.balance || 0)}
                            </p>
                        </div>
                        <Button size="sm" variant="outline">
                            Sacar
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Filter */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">Tudo</TabsTrigger>
                    <TabsTrigger value="earnings" className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Ganhos
                    </TabsTrigger>
                    <TabsTrigger value="xp" className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        XP
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Transaction List */}
            <div className="space-y-4">
                {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
                    <div key={date}>
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">{date}</span>
                        </div>

                        <div className="space-y-2">
                            {dayTransactions.map((tx) => (
                                <Card
                                    key={tx.transaction_id}
                                    className={cn(
                                        "overflow-hidden transition-all hover:shadow-md",
                                        filter === 'earnings' && tx.amount <= 0 && 'hidden',
                                        filter === 'xp' && tx.xp_earned <= 0 && 'hidden'
                                    )}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-3">
                                            {/* Icon */}
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                {getTransactionIcon(tx.transaction_type)}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium text-sm truncate">
                                                        {getTransactionTypeLabel(tx.transaction_type)}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {tx.amount !== 0 && (
                                                            <span className={cn(
                                                                "font-bold text-sm",
                                                                tx.amount > 0 ? "text-green-600" : "text-red-600"
                                                            )}>
                                                                {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                                            </span>
                                                        )}
                                                        {tx.xp_earned > 0 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{tx.xp_earned} XP
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                        {tx.description}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatTime(tx.transaction_date)}
                                                    </span>
                                                </div>

                                                {/* Calculation breakdown */}
                                                {tx.calculation_details && (
                                                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-2 text-xs">
                                                        {tx.calculation_details.base_amount && (
                                                            <Badge variant="outline" className="gap-1">
                                                                <Navigation className="w-3 h-3" />
                                                                Base: {formatCurrency(tx.calculation_details.base_amount)}
                                                            </Badge>
                                                        )}
                                                        {tx.calculation_details.distance_km && (
                                                            <Badge variant="outline" className="gap-1">
                                                                {tx.calculation_details.distance_km.toFixed(1)} km
                                                            </Badge>
                                                        )}
                                                        {tx.calculation_details.gamification_bonus > 0 && (
                                                            <Badge variant="outline" className="gap-1 bg-purple-50">
                                                                <Trophy className="w-3 h-3 text-purple-500" />
                                                                +{formatCurrency(tx.calculation_details.gamification_bonus)}
                                                            </Badge>
                                                        )}
                                                        {tx.calculation_details.wait_bonus > 0 && (
                                                            <Badge variant="outline" className="gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                +{formatCurrency(tx.calculation_details.wait_bonus)}
                                                            </Badge>
                                                        )}
                                                        {tx.calculation_details.rating === 5 && (
                                                            <Badge variant="outline" className="gap-1 bg-yellow-50">
                                                                <Star className="w-3 h-3 text-yellow-500" />
                                                                5★
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}

                {transactions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Nenhuma transação ainda</p>
                        <p className="text-sm">Complete entregas para ver seu extrato aqui!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
