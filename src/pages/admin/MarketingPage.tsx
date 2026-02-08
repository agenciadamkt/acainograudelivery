import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Megaphone, Users, Send, Image as ImageIcon, Plus, Trash2,
    Save, History, Filter, Clock, Calendar, Loader2, CheckCircle2, XCircle, Cake
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Choice {
    title: string;
    value: string;
}

type Segment = 'all' | 'new' | 'inactive' | 'birthday' | 'vip';

export default function MarketingPage() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const [campaignName, setCampaignName] = useState('');
    const [targetPhone, setTargetPhone] = useState('');
    const [message, setMessage] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [footerText, setFooterText] = useState('Açaí no Grau');
    const [choices, setChoices] = useState<Choice[]>([
        { title: 'Ver Cardápio', value: 'ver_cardapio' }
    ]);
    const [segment, setSegment] = useState<Segment>('all');

    // Handle Navigation State from Analytics
    useEffect(() => {
        if (location.state) {
            const { type, template_message, template_name, segment: initialSegment } = location.state as any;

            if (template_name) setCampaignName(template_name);
            if (template_message) setMessage(template_message);
            if (initialSegment) setSegment(initialSegment);

            toast({
                title: 'Template Carregado',
                description: `Campanha "${type || 'Personalizada'}" iniciada via Analytics.`
            });
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [showScheduleDialog, setShowScheduleDialog] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Queries
    const { data: customers } = useQuery({
        queryKey: ['admin-customers-marketing'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('*, orders(created_at, total_amount), birth_date')
                .order('name');
            if (error) throw error;
            return data;
        },
    });

    // Query for Saved Templates (already saved in marketing_campaigns table)
    const { data: savedCampaigns } = useQuery({
        queryKey: ['admin-marketing-campaigns'],
        queryFn: async () => {
            // @ts-ignore
            const { data, error } = await supabase
                .from('marketing_campaigns')
                .select('*')
                .eq('category', 'manual') // Only manual templates
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: scheduledCampaigns } = useQuery({
        queryKey: ['admin-scheduled-campaigns'],
        queryFn: async () => {
            // @ts-ignore
            const { data, error } = await supabase
                .from('scheduled_campaigns')
                .select('*')
                .order('created_at', { ascending: false }) // Mostrar as mais recentes criadas
                .limit(20);
            if (error) throw error;
            return data;
        },
    });

    // Filtering Logic
    const filteredCustomers = useMemo(() => {
        if (!customers) return [];

        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const thirtyDaysAgo = subDays(now, 30);

        return customers.filter(customer => {
            if (segment === 'all') return true;

            if (segment === 'new') {
                return isAfter(new Date(customer.created_at), sevenDaysAgo);
            }

            if (segment === 'inactive') {
                const lastOrders = customer.orders || [];
                if (lastOrders.length === 0) return true;
                // Ordenar pedidos por data decrescente para pegar o último
                const sortedOrders = [...lastOrders].sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                const lastOrderDate = new Date(sortedOrders[0].created_at);
                // Inativo se o ultimo pedido foi antes de 30 dias atrás
                return !isAfter(lastOrderDate, thirtyDaysAgo);
            }

            if (segment === 'birthday') {
                if (!customer.birth_date) return false;
                // Ajuste de fuso horário simples (considerando data salva como string YYYY-MM-DD)
                const birthDateParts = customer.birth_date.split('-');
                if (birthDateParts.length !== 3) return false;

                const birthMonth = parseInt(birthDateParts[1]) - 1; // JS months 0-11
                const birthDay = parseInt(birthDateParts[2]);

                const todayMonth = now.getMonth();
                const todayDay = now.getDate();

                return birthMonth === todayMonth && birthDay === todayDay;
            }

            if (segment === 'vip') {
                // Regra VIP: Mais de 5 pedidos
                const orderCount = customer.orders?.length || 0;
                return orderCount >= 5;
            }

            return true;
        });
    }, [customers, segment]);

    // Mutations
    const saveCampaign = useMutation({
        mutationFn: async () => {
            if (!campaignName || !message) throw new Error('Nome e mensagem são obrigatórios');

            // @ts-ignore
            const { data, error } = await supabase
                .from('marketing_campaigns')
                .insert({
                    name: campaignName,
                    message: message,
                    image_url: imageUrl || null,
                    footer_text: footerText,
                    choices: choices.filter(c => c.title),
                    category: 'manual'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast({ title: 'Campanha salva!', description: 'O template agora está no seu histórico.' });
            queryClient.invalidateQueries({ queryKey: ['admin-marketing-campaigns'] });
        }
    });

    const deleteSimpleCampaign = useMutation({
        mutationFn: async (id: string) => {
            // @ts-ignore
            const { error } = await supabase
                .from('marketing_campaigns')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Modelo excluído' });
            queryClient.invalidateQueries({ queryKey: ['admin-marketing-campaigns'] });
        }
    });

    const scheduleOrSendCampaign = useMutation({
        mutationFn: async ({ isScheduled }: { isScheduled: boolean }) => {
            if (!message) throw new Error('Mensagem é obrigatória');

            // Define Data de Envio: Se agendado, usa o input. Se "Agora", usa NOW.
            let scheduledForIso = new Date().toISOString();

            if (isScheduled) {
                if (!scheduledDate || !scheduledTime) throw new Error('Data e hora são obrigatórias');
                scheduledForIso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            // 1. CRIAR CAMPANHA NA TABELA (Sempre!)
            // Isso garante que fica no histórico
            // @ts-ignore
            const { data: campaignRecord, error: insertError } = await supabase
                .from('scheduled_campaigns')
                .insert({
                    name: campaignName || `Campanha ${format(new Date(), 'dd/MM HH:mm')}`,
                    message: message,
                    image_url: imageUrl || null,
                    footer_text: footerText,
                    choices: choices.filter(c => c.title),
                    segment: segment,
                    scheduled_for: scheduledForIso,
                    status: 'pending' // Começa pendente
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 2. Se for ENVIO IMEDIATO, disparar o Processador AGORA
            if (!isScheduled) {
                try {
                    console.log("Forçando envio imediato via Edge Function...");
                    // Chama a função que varre campanhas pendentes (que acabamos de criar)
                    await supabase.functions.invoke('scheduled-campaigns-check', {
                        body: {}
                    });
                    // Não esperamos retorno detalhado, a função processa em background ou retorna report
                } catch (err) {
                    console.error("Erro ao invocar processador:", err);
                    // Não faz mal falhar aqui, pois o Cron Job vai pegar em 1 minuto de qualquer jeito
                }
            }

            return { scheduled: isScheduled };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['admin-scheduled-campaigns'] });

            if (result.scheduled) {
                toast({
                    title: 'Campanha Agendada!',
                    description: `Será enviada em ${format(new Date(`${scheduledDate}T${scheduledTime}`), "dd/MM 'às' HH:mm")}`,
                });
                setShowScheduleDialog(false);
            } else {
                toast({
                    title: 'Envio Iniciado!',
                    description: `A campanha foi criada e está sendo processada. Acompanhe na lista abaixo.`,
                });
            }
            setIsSending(false);
        },
        onError: (error: any) => {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
            setIsSending(false);
        }
    });

    // ... (rest of helper functions addChoice, etc. same as before)
    const addChoice = () => {
        if (choices.length >= 3) {
            toast({ title: 'Limite atingido', description: 'Máximo de 3 botões.', variant: 'destructive' });
            return;
        }
        setChoices([...choices, { title: '', value: '' }]);
    };
    const removeChoice = (index: number) => setChoices(choices.filter((_, i) => i !== index));
    const updateChoice = (index: number, field: keyof Choice, value: string) => {
        const newChoices = [...choices];
        newChoices[index][field] = value;
        setChoices(newChoices);
    };

    const handleSendTest = async () => {
        if (!targetPhone || !message) {
            toast({ title: 'Preencha telefone e mensagem', variant: 'destructive' });
            return;
        }
        setIsSending(true);
        try {
            const { error } = await supabase.functions.invoke('whatsapp-notification', {
                body: {
                    test_phone: targetPhone,
                    campaign_data: {
                        text: message,
                        imageButton: imageUrl || undefined,
                        choices: choices.filter(c => c.title).map(c => `${c.title}|${c.value || c.title}`),
                        footerText: footerText
                    }
                }
            });
            if (error) throw error;
            toast({ title: 'Teste enviado!', description: `Para ${targetPhone}` });
        } catch (error: any) {
            toast({ title: 'Erro no envio', description: error.message, variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-[#8D42DD] flex items-center gap-2">
                    <Megaphone className="h-8 w-8" />
                    Marketing Digital
                </h1>
                <p className="text-muted-foreground">Crie campanhas, promoções e engaje seus clientes via WhatsApp.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Campaign Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Nova Campanha</CardTitle>
                            <CardDescription>Configure sua mensagem de disparos em massa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome da Campanha</Label>
                                    <Input
                                        placeholder="Ex: Promoção de Sexta"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Segmento</Label>
                                    <Select value={segment} onValueChange={(v: any) => setSegment(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Clientes</SelectItem>
                                            <SelectItem value="vip">🏆 VIPs (Mais de 5 pedidos)</SelectItem>
                                            <SelectItem value="new">Novos (7 dias)</SelectItem>
                                            <SelectItem value="inactive">Inativos (30 dias)</SelectItem>
                                            <SelectItem value="birthday">Aniversariantes 🎉</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground text-right">
                                        {filteredCustomers.length} clientes selecionados
                                    </p>
                                </div>
                            </div>

                            {/* ... (Existing Message & Inputs UI) ... */}
                            <div className="space-y-2">
                                <Label>Mensagem</Label>
                                <Textarea
                                    className="min-h-[120px]"
                                    placeholder="Digite sua mensagem... Use {name} para personalizar"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">💡 Use <code>{'{name}'}</code> para o nome do cliente</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>URL da Imagem</Label>
                                    <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rodapé</Label>
                                    <Input placeholder="Açaí no Grau" value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t">
                                <div className="flex justify-between items-center">
                                    <Label>Botões (Máx. 3)</Label>
                                    <Button variant="outline" size="sm" onClick={addChoice}><Plus className="h-4 w-4 mr-1" /> Add Botão</Button>
                                </div>
                                {choices.map((choice, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input placeholder="TEXTO" value={choice.title} onChange={(e) => updateChoice(index, 'title', e.target.value)} className="flex-1" />
                                        <Input placeholder="VALOR (opcional)" value={choice.value} onChange={(e) => updateChoice(index, 'value', e.target.value)} className="flex-1" />
                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeChoice(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => saveCampaign.mutate()} disabled={saveCampaign.isPending}>
                                    <Save className="h-4 w-4 mr-2" /> Salvar
                                </Button>

                                <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                                    <Button variant="secondary" onClick={() => setShowScheduleDialog(true)}>
                                        <Calendar className="h-4 w-4 mr-2" /> Agendar
                                    </Button>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Agendar Envio</DialogTitle>
                                            <DialogDescription>Programar disparo para:</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 gap-4 py-4">
                                            <div className="space-y-2"><Label>Data</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
                                            <div className="space-y-2"><Label>Hora</Label><Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={() => scheduleOrSendCampaign.mutate({ isScheduled: true })}>Confirmar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Button className="bg-[#25D366] hover:bg-[#128C7E]" onClick={() => scheduleOrSendCampaign.mutate({ isScheduled: false })} disabled={isSending}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                    Enviar Agora
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Saved Campaigns (Templates) */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Meus Modelos Salvos</CardTitle>
                            <CardDescription className="text-xs">Reutilize suas campanhas salvas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {savedCampaigns?.map((camp: any) => (
                                    <div key={camp.id} className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <p className="text-sm font-medium truncate">{camp.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{camp.message}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => {
                                                    setCampaignName(camp.name);
                                                    setMessage(camp.message);
                                                    setImageUrl(camp.image_url || '');
                                                    setFooterText(camp.footer_text || 'Açaí no Grau');
                                                    if (camp.choices && Array.isArray(camp.choices)) {
                                                        // Ensure valid choices structure
                                                        const cleanChoices = camp.choices.map((c: any) => ({
                                                            title: c.title || '',
                                                            value: c.value || ''
                                                        }));
                                                        setChoices(cleanChoices.length ? cleanChoices : [{ title: '', value: '' }]);
                                                    }
                                                    toast({ title: 'Modelo carregado', description: `Campanha "${camp.name}" pronta para edição.` });
                                                }}
                                            >
                                                Usar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => deleteSimpleCampaign.mutate(camp.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {!savedCampaigns?.length && (
                                    <div className="text-center py-4 text-xs text-muted-foreground">
                                        Nenhum modelo salvo.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Card */}
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Envio de Teste</CardTitle></CardHeader>
                        <CardContent className="flex gap-2">
                            <Input placeholder="Telefone (819...)" value={targetPhone} onChange={(e) => setTargetPhone(e.target.value)} />
                            <Button onClick={handleSendTest} disabled={isSending} size="sm" variant="secondary">Testar</Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview & History */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Preview (Simplificado pra economizar linhas, mantendo visual) */}
                    <Card className="bg-muted/30">
                        <CardHeader><CardTitle className="text-sm">Prévia Mobile</CardTitle></CardHeader>
                        <CardContent className="flex justify-center py-6">
                            <div className="w-[280px] bg-white rounded-xl shadow-lg border-4 border-gray-100 overflow-hidden">
                                <div className="bg-[#075e54] p-2 text-white h-12 flex items-center">
                                    <div className="text-[10px] font-bold">Loja Açaí no Grau</div>
                                </div>
                                {imageUrl && <img src={imageUrl} className="w-full h-40 object-cover" />}
                                <div className="p-3 bg-[#e5ddd5] min-h-[100px]">
                                    <div className="bg-white p-2 rounded-lg shadow-sm text-[13px] relative mb-2">
                                        {message || 'Sua mensagem...'}
                                        <span className="text-[8px] text-gray-400 block text-right mt-1">14:00</span>
                                    </div>
                                    {choices.map((c, i) => c.title && (
                                        <div key={i} className="bg-white py-1.5 text-center text-[#128c7e] text-xs font-bold rounded mb-1 shadow-sm">{c.title}</div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-sm">Histórico de Disparos</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {scheduledCampaigns?.map((camp: any) => (
                                        <TableRow key={camp.id}>
                                            <TableCell className="text-xs font-medium">
                                                {camp.name}<br />
                                                <span className="text-[10px] text-muted-foreground">{format(new Date(camp.created_at), 'dd/MM HH:mm')}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="text-[10px]" variant={camp.status === 'sent' ? 'default' : 'secondary'}>
                                                    {camp.status === 'sent' ? `Sucesso (${camp.sent_count || 0})` : camp.status === 'pending' ? 'Fila de Envio' : camp.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!scheduledCampaigns?.length && <TableRow><TableCell colSpan={2} className="text-center text-xs">Vazio.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
