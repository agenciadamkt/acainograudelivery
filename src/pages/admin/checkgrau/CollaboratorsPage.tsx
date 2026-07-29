/**
 * CheckGrau — Colaboradores (Bloco A). CRUD + vínculo com lojas. Login do app é
 * por WhatsApp+OTP, então o WhatsApp é o identificador principal.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, Store, Eye, Search, Clock, Copy, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCollaborators, useCollaboratorMutations, CARGO_LABEL, STATUS_LABEL,
  type Collaborator, type NewCollaborator, type Cargo, type CollabStatus,
} from '@/hooks/checkgrau/useCollaborators';
import { useCheckgrauStores } from '@/hooks/checkgrau/useCheckgrauStores';
import { useCheckgrauPeople } from '@/hooks/checkgrau/useCheckgrauPeople';
import { useStore } from '@/contexts/StoreContext';
import { CollaboratorDetailDialog } from './CollaboratorDetailDialog';

const STATUS_TONE: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  inativo: 'bg-gray-100 text-gray-500 dark:bg-white/10',
  afastado: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  desligado: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
};

function emptyForm(): NewCollaborator {
  return { name: '', whatsapp: '', cpf: '', cargo: 'operador', photo_url: '', status: 'ativo', store_ids: [] };
}

function CollaboratorDialog({ editing, onClose }: { editing: Collaborator | null; onClose: () => void }) {
  const { data: stores } = useCheckgrauStores();
  const { create, update } = useCollaboratorMutations();
  const [f, setF] = useState<NewCollaborator>(
    editing
      ? { name: editing.name, whatsapp: editing.whatsapp, cpf: editing.cpf, cargo: editing.cargo,
          photo_url: editing.photo_url, status: editing.status, store_ids: editing.store_ids }
      : emptyForm(),
  );

  const [storeSearch, setStoreSearch] = useState('');
  const toggleStore = (id: string) =>
    setF((p) => ({ ...p, store_ids: p.store_ids.includes(id) ? p.store_ids.filter((s) => s !== id) : [...p.store_ids, id] }));
  const filteredStores = (stores ?? []).filter((s) =>
    s.name.toLowerCase().includes(storeSearch.trim().toLowerCase()));

  const submit = () => {
    if (!f.name.trim() || !f.whatsapp.trim()) return;
    if (editing) update.mutate({ id: editing.id, ...f }, { onSuccess: onClose });
    else create.mutate(f, { onSuccess: onClose });
  };

  return (
    <DialogContent className="flex max-h-[88vh] max-w-lg flex-col">
      <DialogHeader><DialogTitle>{editing ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle></DialogHeader>
      <div className="grid flex-1 gap-3 overflow-y-auto py-1 pr-1">
        <div className="grid gap-1.5"><Label>Nome completo</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>WhatsApp</Label><Input placeholder="(86) 9 9999-9999" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>CPF</Label><Input value={f.cpf ?? ''} onChange={(e) => setF({ ...f, cpf: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Cargo</Label>
            <Select value={f.cargo} onValueChange={(v) => setF({ ...f, cargo: v as Cargo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CARGO_LABEL) as Cargo[]).map((c) => <SelectItem key={c} value={c}>{CARGO_LABEL[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as CollabStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as CollabStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5"><Label>Foto (URL, opcional)</Label><Input value={f.photo_url ?? ''} onChange={(e) => setF({ ...f, photo_url: e.target.value })} /></div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Lojas</Label>
            <span className="text-[11px] text-gray-400">{f.store_ids.length} selecionada(s)</span>
          </div>
          {(stores?.length ?? 0) > 8 && (
            <Input placeholder="Buscar loja…" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} className="h-9" />
          )}
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-white/[0.06]">
            {filteredStores.map((s) => (
              <button key={s.id} type="button" onClick={() => toggleStore(s.id)}
                className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  f.store_ids.includes(s.id) ? 'border-transparent bg-purple-600 text-white' : 'border-gray-200 hover:bg-gray-100 dark:border-white/10 dark:hover:bg-white/5')}>
                {s.name}
              </button>
            ))}
            {(stores?.length ?? 0) === 0 && <span className="text-xs text-gray-400">Cadastre lojas primeiro.</span>}
            {(stores?.length ?? 0) > 0 && filteredStores.length === 0 && <span className="text-xs text-gray-400">Nenhuma loja encontrada.</span>}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={submit} disabled={!f.name.trim() || !f.whatsapp.trim() || create.isPending || update.isPending}>
          {editing ? 'Salvar' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const rel = (ms: number | null) => {
  if (!ms) return 'Nunca';
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d <= 0) return 'Hoje';
  if (d === 1) return 'Ontem';
  if (d < 30) return `Há ${d} dias`;
  return new Date(ms).toLocaleDateString('pt-BR');
};

function Gauge({ value }: { value: number }) {
  const r = 15, circ = 2 * Math.PI * r;
  const off = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  const color = value >= 80 ? '#16A34A' : value >= 60 ? '#F59E0B' : value > 0 ? '#EF4444' : '#D1D5DB';
  return (
    <div className="relative h-11 w-11">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-gray-100 dark:stroke-white/10" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function CollaboratorsPage() {
  const { collaborators, metricsOf, detailOf, isLoading } = useCheckgrauPeople();
  const { data: stores } = useCheckgrauStores();
  const { remove } = useCollaboratorMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [detailFor, setDetailFor] = useState<Collaborator | null>(null);

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<string>('all');
  const [storeF, setStoreF] = useState<string>('all');

  const { stores: myStores } = useStore(); // lojas que o gestor tem acesso
  const storeName = (id: string) => stores?.find((s) => s.id === id)?.name ?? '—';

  const q = search.trim().toLowerCase();
  const list = collaborators.filter((c) => {
    if (statusF !== 'all' && c.status !== statusF) return false;
    if (storeF !== 'all' && !c.store_ids.includes(storeF)) return false;
    if (q && !c.name.toLowerCase().includes(q) && !(c.whatsapp || '').includes(q)) return false;
    return true;
  });

  const openEdit = (c: Collaborator) => { setDetailFor(null); setEditing(c); setOpen(true); };

  const appLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/colaborador`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appLink);
      toast.success('Link do app copiado! Envie para o colaborador.');
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente: ' + appLink);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Users className="h-5 w-5 text-purple-600" /> Colaboradores
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Gerencie e acompanhe {collaborators.length} colaborador(es) — score, engajamento e atividade.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-purple-600 hover:bg-purple-700" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Novo colaborador
            </Button>
          </DialogTrigger>
          {open && <CollaboratorDialog editing={editing} onClose={() => setOpen(false)} />}
        </Dialog>
      </div>

      {/* Link do app do colaborador */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3 dark:border-purple-500/15 dark:bg-purple-500/[0.06]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[#7C3AED] dark:bg-purple-500/15">
          <Smartphone className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Link do app do colaborador</p>
          <p className="truncate font-mono text-sm text-gray-700 dark:text-white/70">{appLink}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
          <Copy className="h-4 w-4" /> Copiar link
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar por nome ou WhatsApp…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={storeF} onValueChange={setStoreF}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lojas</SelectItem>
              {myStores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as CollabStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhum colaborador encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Lojas</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Engajamento</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((c) => {
                    const m = metricsOf(c);
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailFor(c)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {c.photo_url
                              ? <img src={c.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                              : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-[#7C3AED] dark:bg-purple-500/15">{c.name.charAt(0).toUpperCase()}</div>}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900 dark:text-white">{c.name}</p>
                              <p className="truncate font-mono text-[11px] text-gray-400">{c.whatsapp} · <span className="capitalize">{CARGO_LABEL[c.cargo]}</span></p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                            <Store className="h-3 w-3" />
                            {c.store_ids.length === 0 ? '—' : c.store_ids.map(storeName).join(', ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[11px]">{m.score}</Badge>
                        </TableCell>
                        <TableCell><div className="flex justify-center"><Gauge value={m.engajamento} /></div></TableCell>
                        <TableCell><span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {rel(m.lastAt)}</span></TableCell>
                        <TableCell>
                          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setDetailFor(c)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhe */}
      <Dialog open={!!detailFor} onOpenChange={(o) => !o && setDetailFor(null)}>
        {detailFor && (
          <CollaboratorDetailDialog
            collaborator={detailFor}
            detail={detailOf(detailFor)}
            onEdit={() => openEdit(detailFor)}
          />
        )}
      </Dialog>
    </div>
  );
}
