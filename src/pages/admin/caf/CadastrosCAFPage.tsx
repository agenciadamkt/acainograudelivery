'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X, Settings2, Briefcase, Radio, Tag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIAS as CATEGORIAS_DEFAULT, CARGOS as CARGOS_DEFAULT, CANAIS as CANAIS_DEFAULT } from './AtendimentosPage';

// ── helpers ─────────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<any> {
  const { data } = await (supabase as any)
    .from('caf_configuracoes')
    .select('value')
    .eq('key', key)
    .single();
  if (!data) return null;
  return data.value;
}

async function upsertSetting(key: string, value: any) {
  const { error } = await (supabase as any)
    .from('caf_configuracoes')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

// ── Generic list manager (Cargo / Canal) ────────────────────────────────────

function ListManager({
  title, description, icon: Icon, settingKey, defaults, color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  settingKey: string;
  defaults: string[];
  color: string;
}) {
  const qc = useQueryClient();
  const [newItem, setNewItem] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving]   = useState(false);

  const { data: items = defaults, isLoading } = useQuery<string[]>({
    queryKey: ['caf_cadastro', settingKey],
    queryFn: async () => {
      const v = await getSetting(settingKey);
      return Array.isArray(v) ? v : defaults;
    },
  });

  const save = async (next: string[]) => {
    setSaving(true);
    try {
      await upsertSetting(settingKey, next);
      qc.invalidateQueries({ queryKey: ['caf_cadastro', settingKey] });
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const v = newItem.trim();
    if (!v) return;
    if (items.includes(v)) { toast.error('Item já existe'); return; }
    await save([...items, v]);
    setNewItem('');
    toast.success(`"${v}" adicionado`);
  };

  const handleDelete = async (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    await save(next);
    toast.success('Removido');
  };

  const startEdit = (idx: number) => { setEditIdx(idx); setEditVal(items[idx]); };

  const confirmEdit = async () => {
    if (editIdx === null) return;
    const v = editVal.trim();
    if (!v) return;
    const next = items.map((x, i) => (i === editIdx ? v : x));
    await save(next);
    setEditIdx(null);
    toast.success('Atualizado');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Add row */}
      <div className="flex gap-2">
        <Input
          placeholder={`Novo ${title.toLowerCase()}...`}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="bg-muted/50 border-none"
        />
        <Button onClick={handleAdd} disabled={saving || !newItem.trim()} className="gap-1.5 shrink-0">
          <Plus size={15} /> Adicionar
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item cadastrado</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl group">
              {editIdx === idx ? (
                <>
                  <Input
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                    className="h-8 text-sm bg-background border-none flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={confirmEdit}>
                    <Check size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditIdx(null)}>
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{item}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(idx)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(idx)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Categoria Manager ────────────────────────────────────────────────────────

function CategoriaManager() {
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving]  = useState(false);

  const { data: catData = CATEGORIAS_DEFAULT, isLoading } = useQuery<Record<string, string[]>>({
    queryKey: ['caf_cadastro', 'caf_categorias'],
    queryFn: async () => {
      const v = await getSetting('caf_categorias');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : CATEGORIAS_DEFAULT;
    },
  });

  const cats = Object.keys(catData);

  const saveData = async (next: Record<string, string[]>) => {
    setSaving(true);
    try {
      await upsertSetting('caf_categorias', next);
      qc.invalidateQueries({ queryKey: ['caf_cadastro', 'caf_categorias'] });
      qc.invalidateQueries({ queryKey: ['caf_categorias_all'] });
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCat = async () => {
    const v = newCat.trim();
    if (!v) return;
    if (cats.includes(v)) { toast.error('Categoria já existe'); return; }
    await saveData({ ...catData, [v]: [] });
    setNewCat('');
    toast.success(`Categoria "${v}" criada`);
  };

  const handleDeleteCat = async (cat: string) => {
    const next = { ...catData };
    delete next[cat];
    await saveData(next);
    toast.success(`Categoria "${cat}" removida`);
  };

  const startEdit = (idx: number) => { setEditIdx(idx); setEditVal(cats[idx]); };

  const confirmEdit = async () => {
    if (editIdx === null) return;
    const oldName = cats[editIdx];
    const newName = editVal.trim();
    if (!newName || newName === oldName) { setEditIdx(null); return; }
    if (cats.includes(newName)) { toast.error('Já existe'); return; }
    const next: Record<string, string[]> = {};
    for (const k of cats) {
      next[k === oldName ? newName : k] = catData[k];
    }
    await saveData(next);
    setEditIdx(null);
    toast.success('Renomeada');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-600">
          <Tag size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Categorias</h2>
          <p className="text-sm text-muted-foreground">Tipos de atendimento. Subcategorias são gerenciadas na aba ao lado.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nova categoria..."
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddCat()}
          className="bg-muted/50 border-none"
        />
        <Button onClick={handleAddCat} disabled={saving || !newCat.trim()} className="gap-1.5 shrink-0">
          <Plus size={15} /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
      ) : cats.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria cadastrada</p>
      ) : (
        <div className="space-y-2">
          {cats.map((cat, idx) => (
            <div key={cat} className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl group">
              {editIdx === idx ? (
                <>
                  <Input
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                    className="h-8 text-sm bg-background border-none flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={confirmEdit}>
                    <Check size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditIdx(null)}>
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{cat}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {catData[cat]?.length || 0} subcategoria{catData[cat]?.length !== 1 ? 's' : ''}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(idx)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCat(cat)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subcategoria Manager ─────────────────────────────────────────────────────

function SubcategoriaManager() {
  const qc = useQueryClient();
  const [selectedCat, setSelectedCat] = useState('');
  const [newSub, setNewSub] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving]   = useState(false);

  const { data: catData = CATEGORIAS_DEFAULT, isLoading } = useQuery<Record<string, string[]>>({
    queryKey: ['caf_cadastro', 'caf_categorias'],
    queryFn: async () => {
      const v = await getSetting('caf_categorias');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : CATEGORIAS_DEFAULT;
    },
  });

  const cats = Object.keys(catData);
  const subcats: string[] = selectedCat ? (catData[selectedCat] || []) : [];

  const saveData = async (next: Record<string, string[]>) => {
    setSaving(true);
    try {
      await upsertSetting('caf_categorias', next);
      qc.invalidateQueries({ queryKey: ['caf_cadastro', 'caf_categorias'] });
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const v = newSub.trim();
    if (!v || !selectedCat) return;
    if (subcats.includes(v)) { toast.error('Subcategoria já existe'); return; }
    await saveData({ ...catData, [selectedCat]: [...subcats, v] });
    setNewSub('');
    toast.success(`"${v}" adicionada`);
  };

  const handleDelete = async (idx: number) => {
    if (!selectedCat) return;
    const next = subcats.filter((_, i) => i !== idx);
    await saveData({ ...catData, [selectedCat]: next });
    toast.success('Removida');
  };

  const startEdit = (idx: number) => { setEditIdx(idx); setEditVal(subcats[idx]); };

  const confirmEdit = async () => {
    if (editIdx === null || !selectedCat) return;
    const v = editVal.trim();
    if (!v) return;
    const next = subcats.map((x, i) => (i === editIdx ? v : x));
    await saveData({ ...catData, [selectedCat]: next });
    setEditIdx(null);
    toast.success('Atualizada');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-600">
          <Layers size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Subcategorias</h2>
          <p className="text-sm text-muted-foreground">Selecione uma categoria e gerencie as suas subcategorias.</p>
        </div>
      </div>

      {/* Category selector */}
      <Select value={selectedCat} onValueChange={v => { setSelectedCat(v); setEditIdx(null); setNewSub(''); }}>
        <SelectTrigger className="bg-muted/50 border-none">
          <SelectValue placeholder="Selecione uma categoria..." />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <SelectItem value="__loading" disabled>Carregando...</SelectItem>
          ) : cats.length === 0 ? (
            <SelectItem value="__empty" disabled>Nenhuma categoria cadastrada</SelectItem>
          ) : (
            cats.map(c => (
              <SelectItem key={c} value={c}>
                {c} <span className="text-muted-foreground text-xs ml-1">({catData[c]?.length || 0})</span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedCat && (
        <>
          <div className="flex gap-2">
            <Input
              placeholder={`Nova subcategoria em "${selectedCat}"...`}
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="bg-muted/50 border-none"
            />
            <Button onClick={handleAdd} disabled={saving || !newSub.trim()} className="gap-1.5 shrink-0">
              <Plus size={15} /> Adicionar
            </Button>
          </div>

          {subcats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma subcategoria em "{selectedCat}"
            </p>
          ) : (
            <div className="space-y-2">
              {subcats.map((sub, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl group">
                  {editIdx === idx ? (
                    <>
                      <Input
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                        className="h-8 text-sm bg-background border-none flex-1"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={confirmEdit}>
                        <Check size={14} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditIdx(null)}>
                        <X size={14} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{sub}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(idx)}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(idx)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CadastrosCAFPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Settings2 size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Cadastros CAF</h1>
          <p className="text-muted-foreground text-sm">Gerencie as listas utilizadas nos atendimentos</p>
        </div>
      </div>

      <Tabs defaultValue="cargo" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="cargo" className="gap-1.5">
            <Briefcase size={14} /> Cargo
          </TabsTrigger>
          <TabsTrigger value="canal" className="gap-1.5">
            <Radio size={14} /> Canal
          </TabsTrigger>
          <TabsTrigger value="categoria" className="gap-1.5">
            <Tag size={14} /> Categoria
          </TabsTrigger>
          <TabsTrigger value="subcategoria" className="gap-1.5">
            <Layers size={14} /> Subcategoria
          </TabsTrigger>
        </TabsList>

        <div className="glass-card p-6">
          <TabsContent value="cargo" className="mt-0">
            <ListManager
              title="Cargo"
              description="Cargos dos solicitantes dos atendimentos"
              icon={Briefcase}
              settingKey="caf_cargos"
              defaults={CARGOS_DEFAULT}
              color="bg-blue-500/10 text-blue-600"
            />
          </TabsContent>

          <TabsContent value="canal" className="mt-0">
            <ListManager
              title="Canal"
              description="Canais pelos quais os atendimentos chegam"
              icon={Radio}
              settingKey="caf_canais"
              defaults={CANAIS_DEFAULT}
              color="bg-green-500/10 text-green-600"
            />
          </TabsContent>

          <TabsContent value="categoria" className="mt-0">
            <CategoriaManager />
          </TabsContent>

          <TabsContent value="subcategoria" className="mt-0">
            <SubcategoriaManager />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
