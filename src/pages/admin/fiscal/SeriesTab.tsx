import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hash, Save } from 'lucide-react';
import { useFiscalSeries } from '@/hooks/fiscal/useFiscalSeries';
import { FISCAL_TIPO_LABEL, type FiscalTipo } from '@/services/fiscal/types';

const TIPOS: FiscalTipo[] = ['NFCE', 'NFE'];

function SerieCard({ tipo }: { tipo: FiscalTipo }) {
  const { series, upsert } = useFiscalSeries();
  const atual = series.find((s) => s.tipo_documento === tipo);
  const [serie, setSerie] = useState('1');
  const [proximo, setProximo] = useState('1');

  useEffect(() => {
    if (atual) { setSerie(String(atual.serie)); setProximo(String(atual.proximo_numero)); }
  }, [atual?.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="h-4 w-4" /> {FISCAL_TIPO_LABEL[tipo]}
          {atual && <Badge variant="outline">próximo nº {atual.proximo_numero}</Badge>}
        </CardTitle>
        <CardDescription>Numeração fiscal deste tipo de documento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Série</Label>
            <Input type="number" value={serie} onChange={(e) => setSerie(e.target.value)} min={1} />
          </div>
          <div className="space-y-2">
            <Label>Próximo número</Label>
            <Input type="number" value={proximo} onChange={(e) => setProximo(e.target.value)} min={1} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Use o "próximo número" para continuar a numeração de outro sistema. A emissão avança automaticamente.
        </p>
        <Button className="w-full gap-2" onClick={() => upsert.mutate({ tipo, serie: Number(serie) || 1, proximo_numero: Number(proximo) || 1 })} disabled={upsert.isPending}>
          <Save className="h-4 w-4" /> Salvar série
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SeriesTab() {
  const { hasCompany, ambiente } = useFiscalSeries();

  if (!hasCompany) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Séries & Numeração</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Configure a empresa fiscal (aba Geral) antes de definir as séries.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Ambiente atual: <b>{ambiente}</b> — as séries são independentes por ambiente.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {TIPOS.map((t) => <SerieCard key={t} tipo={t} />)}
      </div>
    </div>
  );
}
