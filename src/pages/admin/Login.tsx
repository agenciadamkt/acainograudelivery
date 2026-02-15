import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoAcai from '@/assets/logo-acai.png';
import loginBg from '@/assets/login-bg.jpg';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/admin/hub');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (!error) {
      // Check if user is a financial employee (not staff/admin)
      try {
        const { data: financialUser } = await supabase
          .from('financial_users' as any)
          .select('id')
          .eq('email', email.toLowerCase())
          .eq('active', true)
          .maybeSingle();

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');

        const hasStaffRole = roles && roles.some((r: any) => ['admin', 'manager', 'staff', 'franchisee_master'].includes(r.role));

        if (financialUser && !hasStaffRole) {
          // Financial-only employee → go directly to financial page
          navigate('/admin/financeiro');
        } else {
          navigate('/admin/hub');
        }
      } catch {
        navigate('/admin/hub');
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 bg-[#F5F5F7] animate-in slide-in-from-left-4 duration-500">
        <div className="w-full max-w-md space-y-8">

          {/* Logo */}
          <div className="flex justify-start">
            {/* NOTE: If you have the specific logo from design, replace 'logoAcai' with the new path */}
            <img src={logoAcai} alt="Açaí no Grau" className="h-20 w-auto object-contain" />
          </div>

          {/* Headlines */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Bora colocar o faturamento<br />
              no grau? 🔥
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Se tem pedido, a gente organiza.<br />
              Se tem meta, a gente bate.<br />
              Entra aí que o movimento não espera.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-gray-200 h-12 rounded-xl focus:ring-2 focus:ring-[#8D42DD]/20 focus:border-[#8D42DD]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-gray-200 h-12 rounded-xl focus:ring-2 focus:ring-[#8D42DD]/20 focus:border-[#8D42DD]"
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/admin/reset-password"
                className="text-sm font-medium text-[#666666] hover:text-[#8D42DD] transition-colors"
              >
                Recuperar senha?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#6E56CF] hover:bg-[#5a43b5] active:scale-[0.98] transition-all rounded-xl text-lg font-medium shadow-md hover:shadow-lg"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center text-gray-600 font-medium">
            Primeiro acesso? {' '}
            <Link to="/admin/signup" className="text-[#6E56CF] hover:underline font-bold">
              Criar conta
            </Link>
          </div>

        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden md:block relative bg-gray-900 overflow-hidden">
        {/* Overlay gradient for text readability if needed, though design doesn't show text on image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />

        <img
          src={loginBg}
          alt="Açaí Cup Background"
          className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000 zoom-in-105"
          style={{
            objectPosition: 'center',
            filter: 'brightness(0.9)'
          }}
        />
      </div>
    </div>
  );
}
