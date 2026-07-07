import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500">
        <ShieldX size={40} />
      </div>
      <div>
        <h1 className="text-3xl font-black">Acesso Negado</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Você não tem permissão para acessar este módulo.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Solicite ao seu gestor o nível de acesso necessário.
        </p>
      </div>
      <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Voltar
      </Button>
    </div>
  );
}
