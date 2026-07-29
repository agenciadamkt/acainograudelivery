/**
 * CheckGrau (painel) — Mensagens do gestor. Envia avisos para um colaborador ou
 * para a loja toda (broadcast) e mostra o histórico enviado.
 */

import { useMemo, useState } from 'react';
import { Send, MessageSquare, Loader2, Megaphone, User } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckgrauStores } from '@/hooks/checkgrau/useCheckgrauStores';
import { useCollaborators } from '@/hooks/checkgrau/useCollaborators';
import { useSendMessage, useSentMessages } from '@/hooks/checkgrau/useMessages';

const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function CheckgrauMessagesPage() {
  const { user } = useAuth();
  const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gestor';
  const { data: stores = [] } = useCheckgrauStores();
  const { data: collaborators = [] } = useCollaborators();
  const send = useSendMessage();

  const [storeId, setStoreId] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('all'); // 'all' | collaboratorId
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const effectiveStore = storeId || stores[0]?.id || '';
  const { data: sent = [], isLoading: loadingSent } = useSentMessages(effectiveStore || undefined);

  const storeCollaborators = useMemo(
    () => collaborators.filter((c) => c.store_ids.includes(effectiveStore) && c.status === 'ativo'),
    [collaborators, effectiveStore],
  );

  const submit = () => {
    if (!effectiveStore) { toast.error('Selecione uma loja.'); return; }
    if (!body.trim()) { toast.error('Escreva a mensagem.'); return; }
    send.mutate(
      {
        storeId: effectiveStore,
        collaboratorId: recipient === 'all' ? null : recipient,
        title: title || undefined,
        body,
        senderName,
      },
      {
        onSuccess: () => { toast.success('Mensagem enviada.'); setTitle(''); setBody(''); },
        onError: (e: any) => toast.error(e?.message ?? 'Falha ao enviar.'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mensagens</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">Envie avisos para um colaborador ou para a loja toda.</p>
      </div>

      {/* Nova mensagem */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Loja</label>
              <Select value={effectiveStore} onValueChange={(v) => { setStoreId(v); setRecipient('all'); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                <SelectContent>
                  {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Destinatário</label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a loja (broadcast)</SelectItem>
                  {storeCollaborators.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Título (opcional)</label>
            <Input placeholder="Ex: Reunião amanhã" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Mensagem</label>
            <Textarea rows={4} placeholder="Escreva o aviso…" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <Button className="gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={submit} disabled={send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Enviadas</p>
        {loadingSent ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
        ) : sent.length === 0 ? (
          <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
            <CardContent className="py-10 text-center text-sm text-gray-400">
              <MessageSquare className="mx-auto mb-2 h-7 w-7 opacity-40" /> Nenhuma mensagem enviada nesta loja.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sent.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-[#16161D]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-[#7C3AED] dark:bg-purple-500/10">
                    {m.recipient === 'Toda a loja' ? <Megaphone className="h-3 w-3" /> : <User className="h-3 w-3" />} {m.recipient}
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400">{fmt(m.created_at)}</span>
                </div>
                {m.title && <p className="mt-2 font-semibold text-gray-900 dark:text-white">{m.title}</p>}
                <p className="mt-0.5 text-sm text-gray-600 dark:text-white/60">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
