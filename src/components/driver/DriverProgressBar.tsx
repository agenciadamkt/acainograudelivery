import { Award, Star, Trophy, Gem, Flame, TrendingUp, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDriverWallet, getTierConfig, formatXP } from '@/hooks/useDriverGamification';

interface DriverProgressBarProps {
    driverId: string;
    compact?: boolean;
}

export default function DriverProgressBar({ driverId, compact = false }: DriverProgressBarProps) {
    const { data: wallet, isLoading } = useDriverWallet(driverId);

    if (isLoading || !wallet) {
        return (
            <div className={cn(
                "animate-pulse rounded-xl",
                compact ? "h-12 bg-muted" : "h-24 bg-muted"
            )} />
        );
    }

    const tierConfig = getTierConfig(wallet.tier);
    const xpToNext = wallet.xp_for_next_tier - wallet.current_xp;
    const bonusPercent = Math.round((wallet.next_tier_multiplier - 1) * 100);

    const TierIcon = {
        bronze: Award,
        prata: Star,
        ouro: Trophy,
        diamante: Gem,
    }[wallet.tier] || Award;

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                tierConfig.bgColor
            )}>
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "bg-white/50 dark:bg-black/20"
                )}>
                    <TierIcon className="w-5 h-5" style={{ color: tierConfig.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className={cn("font-bold text-sm", tierConfig.textColor)}>
                            {tierConfig.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatXP(wallet.current_xp)} XP
                        </span>
                    </div>
                    <Progress value={wallet.xp_progress_percent} className="h-1.5" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "p-4 rounded-2xl border-2 shadow-lg relative overflow-hidden",
            tierConfig.bgColor,
            wallet.tier === 'diamante' && "animate-pulse"
        )}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <TierIcon className="w-full h-full" style={{ color: tierConfig.color }} />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            "bg-white/80 dark:bg-black/30 shadow-md"
                        )}>
                            <TierIcon className="w-6 h-6" style={{ color: tierConfig.color }} />
                        </div>
                        <div>
                            <p className={cn("text-lg font-bold", tierConfig.textColor)}>
                                Nível {tierConfig.name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Multiplicador: {wallet.tier_multiplier}x
                            </p>
                        </div>
                    </div>
                    {wallet.current_streak_days > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-orange-600">
                                {wallet.current_streak_days} dias
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            {formatXP(wallet.current_xp)} XP
                        </span>
                        <span className="font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {wallet.next_tier !== wallet.tier
                                ? `${formatXP(xpToNext)} para ${wallet.next_tier.charAt(0).toUpperCase() + wallet.next_tier.slice(1)}`
                                : 'Nível máximo!'
                            }
                        </span>
                    </div>
                    <Progress
                        value={wallet.xp_progress_percent}
                        className="h-3 bg-white/50 dark:bg-black/20"
                    />
                </div>

                {/* Benefit teaser */}
                {wallet.next_tier !== wallet.tier && (
                    <p className="mt-3 text-xs text-center text-muted-foreground">
                        🎁 Suba para <strong>{wallet.next_tier}</strong> e ganhe{' '}
                        <strong className="text-green-600">+{bonusPercent}%</strong> por entrega!
                    </p>
                )}
            </div>
        </div>
    );
}
