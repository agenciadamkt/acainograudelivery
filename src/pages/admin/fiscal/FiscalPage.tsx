import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Building2, ShieldCheck, Hash, Printer, Settings2, RefreshCw, Plug, Save } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useFiscalCompany } from '@/hooks/fiscal/useFiscalCompany';
import CertificadosTab from './CertificadosTab';
import SeriesTab from './SeriesTab';
import ImpressaoTab from './ImpressaoTab';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const REGIMES = [
  { value: '1', label: '1 — Simples Nacional' },
  { value: '2', label: '2 — Simples Nacional (excesso)' },
  { value: '3', label: '3 — Regime Normal' },
];

export default function FiscalPage({ embedded = false }: { embedded?: boolean }) {
  const { currentStore } = useStore();
  const { company, isLoading, saveConfig, saveToken, sync, testConnection } = useFiscalCompany();

  const [provider, setProvider] = useState('plugnotas');
  const [ambiente, setAmbiente] = useState('homologacao');
  const [timeout, setTimeoutSeg] = useState(30);
  const [autoEmitir, setAutoEmitir] = useState(false);
  const [token, setToken] = useState('');
  const [regime, setRegime] = useState('');
  const [ibge, setIbge] = useState('');

  useEffect(() => {
    if (company) {
      setProvider((company as any).provider || 'plugnotas');
      setAmbiente(company.ambiente || 'homologacao');
      setTimeoutSeg(company.timeout_seg || 30);
      setAutoEmitir(!!company.auto_emitir);
      setRegime(company.regime_tributario ? String(company.regime_tributario) : '');
      setIbge(company.codigo_municipio_ibge || '');
    }
  }, [company]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando módulo fiscal...</div>;

  return (
    <div className="space-y-5">
      {!embedded && (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Fiscal</h1>
          <p className="text-sm text-muted-foreground">
            Emissão de NFC-e / NF-e via PlugNotas — {currentStore?.name}
          </p>
        </div>
      </div>
      )}

      <Tabs defaultValue="geral" className="space-y-5">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="geral" className="gap-1.5"><Settings2 className="h-4 w-4" />Geral</TabsTrigger>
          <TabsTrigger value="empresa" className="gap-1.5"><Building2 className="h-4 w-4" />Empresa</TabsTrigger>
          <TabsTrigger value="certificados" className="gap-1.5"><ShieldCheck className="h-4 w-4" />Certificados</TabsTrigger>
          <TabsTrigger value="series" className="gap-1.5"><Hash className="h-4 w-4" />Séries</TabsTrigger>
          <TabsTrigger value="impressao" className="gap-1.5"><Printer className="h-4 w-4" />Impressão</TabsTrigger>
        </TabsList>

        {/* ── GERAL ── */}
        <TabsContent value="geral">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ambiente & Integração</CardTitle>
                <CardDescription>Configuração do PlugNotas para esta loja.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor fiscal</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plugnotas">PlugNotas (TecnoSpeed)</SelectItem>
                      <SelectItem value="focusnfe">Focus NFe</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Provedor usado para emitir as notas desta loja.</p>
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select value={ambiente} onValueChange={setAmbiente}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timeout (segundos)</Label>
                  <Input type="number" value={timeout} onChange={(e) => setTimeoutSeg(parseInt(e.target.value) || 30)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Emissão automática</Label>
                    <p className="text-xs text-muted-foreground">Emitir ao finalizar a venda/pedido.</p>
                  </div>
                  <Switch checked={autoEmitir} onCheckedChange={setAutoEmitir} />
                </div>
                <Button className="w-full gap-2" onClick={() => saveConfig.mutate({ provider: provider as any, ambiente: ambiente as any, timeout_seg: timeout, auto_emitir: autoEmitir })} disabled={saveConfig.isPending}>
                  <Save className="h-4 w-4" /> Salvar configurações
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token PlugNotas</CardTitle>
                <CardDescription>Guardado cifrado. Nunca é exibido de volta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Token da API</Label>
                  <Input type="password" placeholder="Cole o token do PlugNotas" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
                </div>
                <Button className="w-full gap-2" variant="secondary" onClick={() => { saveToken.mutate(token, { onSuccess: () => setToken('') }); }} disabled={!token || saveToken.isPending}>
                  <ShieldCheck className="h-4 w-4" /> Salvar token
                </Button>
                <Button className="w-full gap-2" variant="outline" onClick={() => testConnection.mutate()} disabled={testConnection.isPending}>
                  <Plug className="h-4 w-4" /> {testConnection.isPending ? 'Testando...' : 'Testar conexão'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── EMPRESA ── */}
        <TabsContent value="empresa">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identidade fiscal da loja</CardTitle>
                <CardDescription>Editável em <b>Dados da Loja</b>. Usada no cadastro do emitente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Razão social" value={(currentStore as any)?.razao_social} />
                <Row label="CNPJ" value={(currentStore as any)?.cnpj} />
                <Row label="Inscrição Estadual" value={(currentStore as any)?.inscricao_estadual} />
                <Row label="Inscrição Municipal" value={(currentStore as any)?.inscricao_municipal} />
                <Row label="Município / UF" value={[(currentStore as any)?.city, (currentStore as any)?.state].filter(Boolean).join(' / ')} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados fiscais complementares</CardTitle>
                <CardDescription>Necessários para emitir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Regime tributário (CRT)</Label>
                  <Select value={regime} onValueChange={setRegime}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{REGIMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código IBGE do município</Label>
                  <Input value={ibge} onChange={(e) => setIbge(e.target.value)} placeholder="Ex: 1721000" />
                </div>
                <Button className="w-full gap-2" onClick={() => saveConfig.mutate({ regime_tributario: regime ? Number(regime) : null as any, codigo_municipio_ibge: ibge || null as any })} disabled={saveConfig.isPending}>
                  <Save className="h-4 w-4" /> Salvar dados fiscais
                </Button>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status no PlugNotas</span>
                    {company?.plugnotas_company_id
                      ? <Badge className="bg-emerald-100 text-emerald-700">Cadastrada</Badge>
                      : <Badge variant="outline">Não cadastrada</Badge>}
                  </div>
                  {company?.ultimo_sync && (
                    <p className="text-xs text-muted-foreground">Último sync: {format(new Date(company.ultimo_sync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  )}
                  <Button className="w-full gap-2" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
                    <RefreshCw className={`h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} /> {sync.isPending ? 'Sincronizando...' : 'Cadastrar / Sincronizar no PlugNotas'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="certificados"><CertificadosTab /></TabsContent>
        <TabsContent value="series"><SeriesTab /></TabsContent>
        <TabsContent value="impressao"><ImpressaoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={value ? 'font-medium' : 'text-amber-600'}>{value || 'não informado'}</span>
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">Em breve.</p></CardContent>
    </Card>
  );
}
