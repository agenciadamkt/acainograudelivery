import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Truck, Loader2 } from 'lucide-react';
import { useMotoristaLogin } from '@/hooks/frota/useMotoristaAuth';

export default function MotoristaLogin() {
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { login, isLoading } = useMotoristaLogin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const session = await login(phone);
    if (!session) {
      toast.error('Nenhum motorista ativo encontrado com este número.');
      return;
    }

    toast.success(`Bem-vindo, ${session.nome}!`);
    navigate('/frota/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 safe-area-top safe-area-bottom">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-100 p-4 rounded-full">
              <Truck className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Controle de Frota</CardTitle>
          <CardDescription>
            Digite seu número de celular para acessar suas rotas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="tel"
                placeholder="Seu Celular (apenas números)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="text-lg py-6 text-center"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
