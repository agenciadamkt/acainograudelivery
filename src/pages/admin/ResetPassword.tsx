import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logoAcai from '@/assets/logo-acai.png';
import resetPasswordBg from '@/assets/reset-password-bg.jpg';

export default function ResetPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const { resetPassword } = useAuth(); // Assuming resetPassword exists in context, if not standard supabase one

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await resetPassword(email);
            if (error) {
                toast.error('Erro ao enviar email de recuperação: ' + error.message);
            } else {
                setIsSent(true);
                toast.success('Email de recuperação enviado com sucesso!');
            }
        } catch (error) {
            toast.error('Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
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
                            Recuperar Senha 🔐
                        </h1>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            Esqueceu sua senha? Não se preocupe.<br />
                            Digite seu email abaixo e enviaremos um link para você redefinir.
                        </p>
                    </div>

                    {/* Form or Success Message */}
                    {!isSent ? (
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

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-[#6E56CF] hover:bg-[#5a43b5] active:scale-[0.98] transition-all rounded-xl text-lg font-medium shadow-md hover:shadow-lg"
                            >
                                {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                            </Button>

                            <div className="flex justify-center">
                                <Link
                                    to="/admin/login"
                                    className="text-sm font-medium text-[#666666] hover:text-[#8D42DD] transition-colors flex items-center gap-2"
                                >
                                    ← Voltar para Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">✉️</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Email Enviado!</h3>
                            <p className="text-gray-600">
                                Verifique sua caixa de entrada (e spam) para encontrar o link de redefinição de senha enviado para <strong>{email}</strong>.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full h-12 border-[#6E56CF] text-[#6E56CF] hover:bg-[#6E56CF]/5"
                                onClick={() => setIsSent(false)}
                            >
                                Tentar outro email
                            </Button>
                            <Link
                                to="/admin/login"
                                className="block text-sm font-medium text-[#666666] hover:text-[#8D42DD] transition-colors mt-4"
                            >
                                Voltar para Login
                            </Link>
                        </div>
                    )}

                </div>
            </div>

            {/* Right Side - Image */}
            <div className="hidden md:block relative bg-gray-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />

                <img
                    src={resetPasswordBg}
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
