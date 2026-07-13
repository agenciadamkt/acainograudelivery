import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Upload, AlertTriangle } from 'lucide-react';
import { useFiscalCertificates } from '@/hooks/fiscal/useFiscalCertificates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_META: Record<string, { label: string; className: string }> = {
  valido:             { label: 'Válido',              className: 'bg-emerald-100 text-emerald-700' },
  proximo_vencimento: { label: 'Vence em breve',      className: 'bg-amber-100 text-amber-700' },
  vencido:            { label: 'Vencido',             className: 'bg-red-100 text-red-700' },
};

export default function CertificadosTab() {
  const { certificates, isLoading, upload } = useFiscalCertificates();
  const [file, setFile] = useState<File | null>(null);
  const [senha, setSenha] = useState('');

  const handleUpload = () => {
    if (!file) return;
    if (!senha) return;
    upload.mutate({ file, senha }, { onSuccess: () => { setFile(null); setSenha(''); } });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Enviar certificado (A1)</CardTitle>
          <CardDescription>O arquivo <b>.pfx/.p12</b> vai direto ao PlugNotas. Nunca é armazenado aqui.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Arquivo do certificado (.pfx / .p12)</Label>
            <Input type="file" accept=".pfx,.p12" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-2">
            <Label>Senha do certificado</Label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha do .pfx" autoComplete="off" />
          </div>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>A senha é repassada ao PlugNotas apenas no envio e <b>não é guardada</b> no sistema.</span>
          </div>
          <Button className="w-full gap-2" onClick={handleUpload} disabled={!file || !senha || upload.isPending}>
            <Upload className="h-4 w-4" /> {upload.isPending ? 'Enviando...' : 'Enviar certificado'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificados da loja</CardTitle>
          <CardDescription>Histórico e validade.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>
          ) : certificates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum certificado enviado.</p>
          ) : (
            <div className="divide-y">
              {certificates.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.nome_cn || c.titular_cnpj || 'Certificado'}</span>
                      {c.ativo && <Badge className="bg-primary/10 text-primary">Ativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.vencimento ? `Vence em ${format(new Date(c.vencimento), 'dd/MM/yyyy', { locale: ptBR })}` : 'Sem data de validade'}
                    </p>
                  </div>
                  <Badge className={STATUS_META[c.status]?.className}>{STATUS_META[c.status]?.label || c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
