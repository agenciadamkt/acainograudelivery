import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Award,
    Star,
    Trophy,
    Gem,
    Check,
    Lock,
    Zap,
    Users,
    Briefcase,
    Crown,
    ChevronRight,
    Flame,
    Target,
} from 'lucide-react';
import {
    useDriverWallet,
    useGamificationTiers,
    getTierConfig,
    formatXP,
} from '@/hooks/useDriverGamification';
import { cn } from '@/lib/utils';

interface CareerPlanProps {
    driverId: string;
}

export default function CareerPlan({ driverId }: CareerPlanProps) {
    const { data: wallet } = useDriverWallet(driverId);
    const { data: tiers = [], isLoading } = useGamificationTiers();

    const getTierIcon = (tierName: string) => {
        switch (tierName) {
            case 'bronze': return Award;
            case 'prata': return Star;
            case 'ouro': return Trophy;
            case 'diamante': return Gem;
            default: return Award;
        }
    };

    const getBenefits = (tier: any) => {
        const benefits = [];
        if (tier.multiplier > 1) {
            benefits.push({
                icon: Zap,
                label: `+${Math.round((tier.multiplier - 1) * 100)}% por entrega`,
            });
        }
        if (tier.dispatch_priority) {
            benefits.push({
                icon: Users,
                label: 'Prioridade no dispatch',
            });
        }
        if (tier.corporate_access) {
            benefits.push({
                icon: Briefcase,
                label: 'Pedidos corporativos',
            });
        }
        return benefits;
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        );
    }

    const currentTierIndex = tiers.findIndex(t => t.tier_name === wallet?.tier);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Crown className="w-6 h-6 text-yellow-500" />
                    Plano de Carreira
                </h2>
                <p className="text-muted-foreground">
                    Complete entregas, ganhe XP e suba de nível!
                </p>
            </div>

            {/* Current Progress */}
            {wallet && (
                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Seu Progresso</span>
                            </div>
                            <Badge variant="outline" className="bg-white/50">
                                {formatXP(wallet.current_xp)} XP total
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                            {tiers.map((tier, idx) => {
                                const isCompleted = idx < currentTierIndex;
                                const isCurrent = idx === currentTierIndex;
                                const config = getTierConfig(tier.tier_name);
                                const Icon = getTierIcon(tier.tier_name);

                                return (
                                    <div key={tier.id} className="flex items-center">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                            isCompleted && "bg-green-100 dark:bg-green-900/30",
                                            isCurrent && cn(config.bgColor, "ring-2 ring-offset-2 ring-purple-500"),
                                            !isCompleted && !isCurrent && "bg-muted opacity-50"
                                        )}>
                                            {isCompleted ? (
                                                <Check className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <Icon className="w-5 h-5" style={{ color: config.color }} />
                                            )}
                                        </div>
                                        {idx < tiers.length - 1 && (
                                            <div className={cn(
                                                "w-8 h-1 mx-1 rounded",
                                                idx < currentTierIndex ? "bg-green-500" : "bg-muted"
                                            )} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tier Cards */}
            <div className="space-y-4">
                {tiers.map((tier, idx) => {
                    const isCompleted = idx < currentTierIndex;
                    const isCurrent = idx === currentTierIndex;
                    const isLocked = idx > currentTierIndex;
                    const config = getTierConfig(tier.tier_name);
                    const Icon = getTierIcon(tier.tier_name);
                    const benefits = getBenefits(tier);

                    // Calcular progresso para o tier atual
                    let progressPercent = 0;
                    if (isCurrent && wallet) {
                        const tierStart = tier.min_xp;
                        const tierEnd = tier.max_xp || tier.min_xp + 10000;
                        progressPercent = Math.min(
                            ((wallet.current_xp - tierStart) / (tierEnd - tierStart)) * 100,
                            100
                        );
                    }

                    return (
                        <Card
                            key={tier.id}
                            className={cn(
                                "relative overflow-hidden transition-all",
                                isCurrent && "ring-2 ring-purple-500 shadow-lg",
                                isLocked && "opacity-60"
                            )}
                        >
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                                <Icon className="w-full h-full" style={{ color: config.color }} />
                            </div>

                            <CardContent className="pt-4 relative">
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                                        config.bgColor,
                                        isCurrent && "animate-pulse"
                                    )}>
                                        {isCompleted ? (
                                            <Check className="w-7 h-7 text-green-600" />
                                        ) : isLocked ? (
                                            <Lock className="w-7 h-7 text-muted-foreground" />
                                        ) : (
                                            <Icon className="w-7 h-7" style={{ color: config.color }} />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={cn("text-lg font-bold", config.textColor)}>
                                                {config.name}
                                            </h3>
                                            <Badge variant="outline" className="text-xs">
                                                {formatXP(tier.min_xp)} - {tier.max_xp ? formatXP(tier.max_xp) : '∞'} XP
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-muted-foreground mb-3">
                                            {tier.description}
                                        </p>

                                        {/* Benefits */}
                                        <div className="flex flex-wrap gap-2">
                                            {benefits.map((benefit, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="secondary"
                                                    className={cn(
                                                        "gap-1",
                                                        isLocked && "opacity-50"
                                                    )}
                                                >
                                                    <benefit.icon className="w-3 h-3" />
                                                    {benefit.label}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Current tier progress */}
                                        {isCurrent && wallet && (
                                            <div className="mt-3 pt-3 border-t">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">Progresso</span>
                                                    <span className="font-medium">
                                                        {tier.max_xp
                                                            ? `${formatXP(wallet.current_xp - tier.min_xp)} / ${formatXP(tier.max_xp - tier.min_xp)} XP`
                                                            : 'Nível máximo!'
                                                        }
                                                    </span>
                                                </div>
                                                <Progress value={progressPercent} className="h-2" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status indicator */}
                                {isCurrent && (
                                    <div className="absolute top-2 right-2">
                                        <Badge className="bg-purple-600">
                                            <Flame className="w-3 h-3 mr-1" />
                                            Você está aqui
                                        </Badge>
                                    </div>
                                )}

                                {isCompleted && (
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                                            <Check className="w-3 h-3 mr-1" />
                                            Conquistado
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* XP Rules */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Como ganhar XP
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Entrega concluída</span>
                        <Badge>+10 XP</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Avaliação 5 estrelas</span>
                        <Badge className="bg-yellow-500">+20 XP</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <span className="text-sm">Missão de deslocamento</span>
                        <Badge className="bg-blue-500">+50 XP</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-orange-50 dark:bg-orange-950/30">
                        <span className="text-sm flex items-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Sequência de 5 dias
                        </span>
                        <Badge className="bg-orange-500">+100 XP</Badge>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200">
                        <p className="text-xs text-red-700 dark:text-red-300">
                            ⚠️ <strong>Atenção:</strong> Ficar mais de 7 dias sem trabalhar causa perda de 10% do XP atual.
                            Mantenha-se ativo para não perder seu progresso!
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
