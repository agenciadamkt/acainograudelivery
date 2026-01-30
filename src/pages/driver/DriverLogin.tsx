import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bike, Loader2 } from 'lucide-react';

export default function DriverLogin() {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Debug Env Vars
            const sbUrl = import.meta.env.VITE_SUPABASE_URL;
            if (!sbUrl) {
                toast.error("ERRO CRÍTICO: VITE_SUPABASE_URL não definida!");
                setIsLoading(false);
                return;
            }

            // Find driver by phone (simple auth for now)
            const cleanPhone = phone.replace(/\D/g, '');

            const { data, error } = await supabase
                .from('delivery_drivers' as any)
                .select('*')
                .eq('phone', cleanPhone)
                .single(); // Removed .eq('active', true) temporarily to debug

            if (error) {
                console.error("Supabase Query Error:", error);
                toast.error(`Erro Query: ${error.message} (${error.code})`);
                setIsLoading(false);
                return;
            }

            if (!data) {
                toast.error('Nenhum motorista encontrado com este número.');
                setIsLoading(false);
                return;
            }

            if (!data.active) {
                toast.error('Motorista encontrado, mas está INATIVO.');
                setIsLoading(false);
                return;
            }

            // Save driver info locally
            localStorage.setItem('driver_id', data.id);
            localStorage.setItem('driver_name', data.name);
            localStorage.setItem('driver_store_id', data.store_id);

            toast.success(`Bem-vindo, ${data.name}!`);
            navigate('/driver/dashboard');

        } catch (error: any) {
            console.error('Login error:', error);
            // Show detailed error for debugging
            const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
            toast.error(`Erro: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-4 rounded-full">
                            <Bike className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Área do Entregador</CardTitle>
                    <CardDescription>
                        Digite seu número de celular para acessar
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="tel"
                                placeholder="Seu Celular (apenas números)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className="text-lg py-6 text-center"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                'Entrar'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
