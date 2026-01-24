import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        nps: 0,
        positive: 0,
        neutral: 0,
        negative: 0
    });

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        const { data, error } = await supabase
            .from('order_feedback' as any) // Type casting since table is new
            .select(`
        *,
        order:orders(order_number),
        customer:customers(name)
      `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching feedbacks:', error);
            return;
        }

        setFeedbacks(data || []);
        calculateStats(data || []);
    };

    const calculateStats = (data: any[]) => {
        const total = data.length;
        if (total === 0) return;

        const positive = data.filter(f => f.category === 'positive').length;
        const neutral = data.filter(f => f.category === 'neutral').length;
        const negative = data.filter(f => f.category === 'negative').length;

        // NPS Calculation (simplified for this context)
        // Promoters (5), Detractors (1-3)
        const promoters = positive;
        const detractors = negative + neutral; // Assuming neutrals are not promoters
        const nps = ((promoters - detractors) / total) * 100;

        setStats({
            total,
            nps: Math.round(nps),
            positive,
            neutral,
            negative
        });
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Feedback & NPS</h1>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.nps}</div>
                            <p className="text-xs text-muted-foreground">Pontuação Geral</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">Promotores</CardTitle>
                            <ThumbsUp className="h-4 w-4 text-green-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{stats.positive}</div>
                            <p className="text-xs text-green-600/80">Avaliaram com "Amei!"</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-yellow-50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-yellow-700">Neutros</CardTitle>
                            <Minus className="h-4 w-4 text-yellow-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-700">{stats.neutral}</div>
                            <p className="text-xs text-yellow-600/80">"Pode melhorar"</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">Detratores</CardTitle>
                            <ThumbsDown className="h-4 w-4 text-red-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{stats.negative}</div>
                            <p className="text-xs text-red-600/80">"Tive um problema"</p>
                        </CardContent>
                    </Card>
                </div>

                {/* List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Últimas Avaliações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {feedbacks.map((feedback) => (
                                <div key={feedback.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`
                      h-10 w-10 rounded-full flex items-center justify-center
                      ${feedback.category === 'positive' ? 'bg-green-100 text-green-600' :
                                                feedback.category === 'neutral' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}
                    `}>
                                            {feedback.category === 'positive' && <ThumbsUp className="h-5 w-5" />}
                                            {feedback.category === 'neutral' && <Minus className="h-5 w-5" />}
                                            {feedback.category === 'negative' && <ThumbsDown className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                Pedido #{feedback.order?.order_number} - {feedback.customer?.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {feedback.comment || "Sem comentário"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground block">
                                            {format(new Date(feedback.created_at), 'dd/MM/yyyy HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {feedbacks.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma avaliação recebida ainda.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
