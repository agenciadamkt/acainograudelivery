/**
 * CheckGrau — Lojas (Bloco A). Lista e edita as lojas (tabela `stores`).
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
import { Plus, Pencil, Store } from 'lucide-react';
import { useCheckgrauStores, useStoreMutations, type CgStore } from '@/hooks/checkgrau/useCheckgrauStores';

function empty(): Partial<CgStore> {
  return { name: '', code: '', address: '', city: '', state: '', phone: '', status: 'active' };
}
const STATUS_LABEL: Record<string, string> = { active: 'Ativo', inactive: 'Inativo', ativo: 'Ativo', inativo: 'Inativo' };

function StoreDialog({ editing, onClose }: { editing: CgStore | null; onClose: () => void }) {
  const { create, update } = useStoreMutations();
  const [f, setF] = useState<Partial<CgStore>>(editing ?? empty());
  const set = (k: keyof CgStore, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.name?.trim()) return;
    if (editing) update.mutate({ id: editing.id, ...f }, { onSuccess: onClose });
    else create.mutate(f, { onSuccess: onClose });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? 'Editar loja' : 'Nova loja'}</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-1">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <div className="grid gap-1.5"><Label>Nome</Label><Input value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Código</Label><Input value={f.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label>Endereço</Label><Input value={f.address ?? ''} onChange={(e) => set('address', e.target.value)} /></div>
        <div className="grid grid-cols-[1fr_90px_1fr] gap-3">
          <div className="grid gap-1.5"><Label>Cidade</Label><Input value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>UF</Label><Input maxLength={2} value={f.state ?? ''} onChange={(e) => set('state', e.target.value.toUpperCase())} /></div>
          <div className="grid gap-1.5"><Label>Telefone</Label><Input value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5">
          <Label>Status</Label>
          <Select value={f.status ?? 'active'} onValueChange={(v) => set('status', v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={submit} disabled={!f.name?.trim() || create.isPending || update.isPending}>
          {editing ? 'Salvar' : 'Criar loja'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function StoresPage() {
  const { data, isLoading } = useCheckgrauStores();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CgStore | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <Store className="h-5 w-5 text-purple-600" /> Lojas
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Unidades da rede — cada loja tem seus checklists e tarefas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-purple-600 hover:bg-purple-700" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Nova loja
            </Button>
          </DialogTrigger>
          {open && <StoreDialog editing={editing} onClose={() => setOpen(false)} />}
        </Dialog>
      </div>

      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data?.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhuma loja cadastrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.code ?? '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{[s.city, s.state].filter(Boolean).join('/') || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{s.phone ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={(s.status ?? 'active') === 'active' ? 'default' : 'secondary'} className="text-[11px]">{STATUS_LABEL[s.status ?? 'active'] ?? s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setEditing(s); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
