import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoAcai from '@/assets/logo-acai.png';
import signupBg from '@/assets/signup-bg.jpg';
import { z } from 'zod';
import { toast } from 'sonner';

const signupSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/admin/hub');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Manual validation via Zod before sending to auth
    const result = signupSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (!error) {
      //   toast.success("Conta criada com sucesso!");
      navigate('/admin/hub');
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
            <img src={logoAcai} alt="Açaí no Grau" className="h-20 w-auto object-contain" />
          </div>

          {/* Headlines */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Comece a faturar<br />
              agora mesmo! 🚀
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Crie sua conta administrativa e tenha controle total sobre suas vendas e entregas.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-700 font-medium">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-gray-200 h-11 rounded-xl focus:ring-2 focus:ring-[#8D42DD]/20 focus:border-[#8D42DD]"
              />
            </div>

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
                className="bg-white border-gray-200 h-11 rounded-xl focus:ring-2 focus:ring-[#8D42DD]/20 focus:border-[#8D42DD]"
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
                className="bg-white border-gray-200 h-11 rounded-xl focus:ring-2 focus:ring-[#8D42DD]/20 focus:border-[#8D42DD]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-gray-200 h-11 rounded-xl focus:ring-2 focus:ring-[#8D42DD]/20 focus:border-[#8D42DD]"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-[#6E56CF] hover:bg-[#5a43b5] active:scale-[0.98] transition-all rounded-xl text-lg font-medium shadow-md hover:shadow-lg"
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta Grátis'}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center text-gray-600 font-medium">
            Já tem uma conta? {' '}
            <Link to="/admin/login" className="text-[#6E56CF] hover:underline font-bold">
              Fazer Login
            </Link>
          </div>

        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden md:block relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />

        <img
          src={signupBg}
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
