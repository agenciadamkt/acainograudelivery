import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================
// TIPOS - Gamificação & Wallet
// =============================================

export interface DriverWallet {
    balance: number;
    pending_balance: number;
    total_earned: number;
    current_xp: number;
    total_xp: number;
    tier: 'bronze' | 'prata' | 'ouro' | 'diamante';
    tier_multiplier: number;
    tier_color: string;
    tier_icon: string;
    xp_for_current_tier: number;
    xp_for_next_tier: number;
    xp_progress_percent: number;
    next_tier: string;
    next_tier_multiplier: number;
    current_streak_days: number;
    longest_streak_days: number;
    days_until_streak_bonus: number;
    total_deliveries: number;
    total_5star_ratings: number;
    total_displacement_missions: number;
}

export interface WalletTransaction {
    transaction_id: string;
    transaction_date: string;
    transaction_type: string;
    amount: number;
    balance_after: number;
    xp_earned: number;
    xp_type: string;
    description: string;
    order_id: string | null;
    calculation_details: {
        base_amount?: number;
        wait_bonus?: number;
        rating_bonus?: number;
        displacement_bonus?: number;
        tier_multiplier?: number;
        gamification_bonus?: number;
        distance_km?: number;
        wait_minutes?: number;
        rating?: number;
    } | null;
}

export interface GamificationTier {
    id: string;
    tier_name: string;
    min_xp: number;
    max_xp: number | null;
    multiplier: number;
    dispatch_priority: boolean;
    corporate_access: boolean;
    badge_color: string;
    badge_icon: string;
    description: string;
}

export interface PaymentCalculation {
    base_amount: number;
    wait_bonus: number;
    rating_bonus: number;
    displacement_bonus: number;
    tier_multiplier: number;
    gamification_bonus: number;
    total_before_multiplier: number;
    total_amount: number;
    xp_earned: number;
    tier_name: string;
}

export interface DeliveryCompletionResult {
    success: boolean;
    payment: {
        base_amount: number;
        wait_bonus: number;
        rating_bonus: number;
        displacement_bonus: number;
        gamification_bonus: number;
        total_amount: number;
    };
    xp: {
        earned: number;
        current: number;
        streak_bonus: number;
    };
    tier: {
        current: string;
        multiplier: number;
        tier_changed: boolean;
    };
    new_balance: number;
}

// =============================================
// Hooks para App do Entregador
// =============================================

// Buscar status completo da carteira
export function useDriverWallet(driverId?: string) {
    return useQuery({
        queryKey: ['driver-wallet', driverId],
        queryFn: async (): Promise<DriverWallet | null> => {
            if (!driverId) return null;

            try {
                const { data, error } = await supabase.rpc('get_driver_wallet_status' as any, {
                    p_driver_id: driverId,
                });

                if (error) throw error;

                // A função retorna um array com 1 elemento
                const result = Array.isArray(data) ? data[0] : data;
                return result as unknown as DriverWallet;
            } catch (error) {
                console.error('Error fetching wallet:', error);
                return null;
            }
        },
        enabled: !!driverId,
        refetchInterval: 30000, // Atualiza a cada 30 segundos
    });
}

// Buscar extrato gamer (transações + XP)
export function useDriverStatement(driverId?: string, limit = 50, offset = 0) {
    return useQuery({
        queryKey: ['driver-statement', driverId, limit, offset],
        queryFn: async (): Promise<WalletTransaction[]> => {
            if (!driverId) return [];

            try {
                const { data, error } = await supabase.rpc('get_driver_gamer_statement' as any, {
                    p_driver_id: driverId,
                    p_limit: limit,
                    p_offset: offset,
                });

                if (error) throw error;
                return (data as unknown as WalletTransaction[]) || [];
            } catch (error) {
                console.error('Error fetching statement:', error);
                return [];
            }
        },
        enabled: !!driverId,
    });
}

// Buscar todos os tiers disponíveis
export function useGamificationTiers() {
    return useQuery({
        queryKey: ['gamification-tiers'],
        queryFn: async (): Promise<GamificationTier[]> => {
            const { data, error } = await supabase
                .from('gamification_tiers' as any)
                .select('*')
                .order('min_xp', { ascending: true });

            if (error) throw error;
            return (data as unknown as GamificationTier[]) || [];
        },
        staleTime: 60000 * 5, // Cache por 5 minutos
    });
}

// Calcular pagamento de uma entrega (preview)
export function useCalculatePayment() {
    return useMutation({
        mutationFn: async ({
            driverId,
            distanceKm,
            waitTimeMinutes = 0,
            rating,
            isDisplacementMission = false,
        }: {
            driverId: string;
            distanceKm: number;
            waitTimeMinutes?: number;
            rating?: number;
            isDisplacementMission?: boolean;
        }): Promise<PaymentCalculation> => {
            const { data, error } = await supabase.rpc('calculate_delivery_payment' as any, {
                p_driver_id: driverId,
                p_distance_km: distanceKm,
                p_wait_time_minutes: waitTimeMinutes,
                p_rating: rating,
                p_is_displacement_mission: isDisplacementMission,
            });

            if (error) throw error;
            const result = Array.isArray(data) ? data[0] : data;
            return result as unknown as PaymentCalculation;
        },
    });
}

// Processar conclusão de entrega (pagamento + XP)
export function useProcessDeliveryCompletion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            driverId,
            orderId,
            distanceKm,
            waitTimeMinutes = 0,
            rating,
            isDisplacementMission = false,
        }: {
            driverId: string;
            orderId: string;
            distanceKm: number;
            waitTimeMinutes?: number;
            rating?: number;
            isDisplacementMission?: boolean;
        }): Promise<DeliveryCompletionResult> => {
            const { data, error } = await supabase.rpc('process_delivery_completion' as any, {
                p_driver_id: driverId,
                p_order_id: orderId,
                p_distance_km: distanceKm,
                p_wait_time_minutes: waitTimeMinutes,
                p_rating: rating,
                p_is_displacement_mission: isDisplacementMission,
            });

            if (error) throw error;
            return data as unknown as DeliveryCompletionResult;
        },
        onSuccess: (result, variables) => {
            queryClient.invalidateQueries({ queryKey: ['driver-wallet', variables.driverId] });
            queryClient.invalidateQueries({ queryKey: ['driver-statement', variables.driverId] });

            // Notificações gamificadas
            if (result.tier.tier_changed) {
                toast.success(`🎉 PARABÉNS! Você subiu para ${result.tier.current.toUpperCase()}!`, {
                    duration: 5000,
                    description: `Novo multiplicador: ${result.tier.multiplier}x`,
                });
            }

            if (result.xp.streak_bonus > 0) {
                toast.success(`🔥 Bônus de Sequência! +${result.xp.streak_bonus} XP`, {
                    description: '5 dias seguidos trabalhando!',
                });
            }

            toast.success(
                `R$ ${result.payment.total_amount.toFixed(2)} + ${result.xp.earned} XP`,
                {
                    description: 'Entrega concluída com sucesso!',
                    icon: '💰',
                }
            );
        },
        onError: (error: any) => {
            toast.error('Erro ao processar entrega: ' + error.message);
        },
    });
}

// =============================================
// Helpers
// =============================================

export const TIER_CONFIG = {
    bronze: {
        color: '#CD7F32',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-800 dark:text-amber-200',
        icon: 'award',
        name: 'Bronze',
    },
    prata: {
        color: '#C0C0C0',
        bgColor: 'bg-slate-100 dark:bg-slate-900/30',
        textColor: 'text-slate-700 dark:text-slate-200',
        icon: 'star',
        name: 'Prata',
    },
    ouro: {
        color: '#FFD700',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        icon: 'trophy',
        name: 'Ouro',
    },
    diamante: {
        color: '#B9F2FF',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
        textColor: 'text-cyan-800 dark:text-cyan-200',
        icon: 'gem',
        name: 'Diamante',
    },
} as const;

export function getTierConfig(tier: string) {
    return TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
}

export function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatXP(xp: number) {
    if (xp >= 1000) {
        return `${(xp / 1000).toFixed(1)}k`;
    }
    return xp.toString();
}

export function getTransactionTypeLabel(type: string) {
    const labels: Record<string, string> = {
        delivery_earning: 'Entrega',
        wait_time_bonus: 'Bônus Espera',
        gamification_bonus: 'Bônus Tier',
        displacement_bonus: 'Missão Deslocamento',
        streak_bonus: 'Bônus Sequência',
        tip: 'Gorjeta',
        withdrawal: 'Saque',
        adjustment: 'Ajuste',
        penalty: 'Penalidade',
    };
    return labels[type] || type;
}

export function getXPTypeLabel(type: string) {
    const labels: Record<string, string> = {
        delivery_completed: 'Entrega',
        five_star_rating: '5 Estrelas',
        displacement_mission: 'Missão',
        streak_bonus: 'Sequência',
        weekly_bonus: 'Bônus Semanal',
        tier_upgrade: 'Subiu Tier',
        inactivity_decay: 'Inatividade',
        referral_bonus: 'Indicação',
    };
    return labels[type] || type;
}
