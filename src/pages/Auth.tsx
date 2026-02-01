import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Phone, CheckCircle, User, MapPin, Send } from 'lucide-react';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { supabase } from '@/integrations/supabase/client';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// Schemas
const loginSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const step1Schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
});

const step2Schema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
});

const step3Schema = z.object({
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  birthdate: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  address: z.object({
    street: z.string().min(3, 'Endereço obrigatório'),
    number: z.string().min(1, 'Número obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, 'Bairro obrigatório'),
    city: z.string().min(2, 'Cidade obrigatória'),
    zipcode: z.string().optional(),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [verifiedData, setVerifiedData] = useState<{ name: string; phone: string } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, register } = useAuth();
  const [successModal, setSuccessModal] = useState<{ open: boolean, title: React.ReactNode }>({ open: false, title: '' });

  const from = (location.state as any)?.from?.pathname || '/menu';

  // Login com telefone (vamos usar email = phone@app.local por baixo dos panos)
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', phone: '' },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { code: '' },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      email: '',
      birthdate: '',
      password: '',
      confirmPassword: '',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        zipcode: '',
      }
    },
  });

  // Handle Login
  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Converter telefone para email fictício para login
      const cleanPhone = data.phone.replace(/\D/g, '');
      const fakeEmail = `${cleanPhone}@acainograu.app`;

      const { error } = await signIn(fakeEmail, data.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Telefone ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      } else {
        setSuccessModal({
          open: true,
          title: <>Login realizado<br /><span className="font-bold">com sucesso!</span></>
        });
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1500);
      }
    } catch (error: any) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Enviar código de verificação
  const handleStep1 = async (data: Step1Data) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { phone: data.phone, name: data.name }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Código enviado para seu WhatsApp!');
      setVerifiedData({ name: data.name, phone: data.phone });
      setSignupStep(2);

      // Iniciar countdown de 60 segundos para reenvio
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar código');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código
  const handleResendCode = async () => {
    if (countdown > 0 || !verifiedData) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { phone: verifiedData.phone, name: verifiedData.name }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Novo código enviado!');
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Erro ao reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verificar código
  const handleStep2 = async (data: Step2Data) => {
    if (!verifiedData) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('verify-whatsapp-code', {
        body: { phone: verifiedData.phone, code: data.code }
      });

      if (response.error || !response.data?.valid) {
        throw new Error(response.data?.error || 'Código inválido');
      }

      toast.success('Telefone verificado!');
      setSignupStep(3);

    } catch (error: any) {
      toast.error(error.message || 'Código inválido ou expirado');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Finalizar cadastro
  const handleStep3 = async (data: Step3Data) => {
    if (!verifiedData) return;

    setIsLoading(true);
    try {
      // Criar email fictício baseado no telefone
      const cleanPhone = verifiedData.phone.replace(/\D/g, '');
      const email = data.email || `${cleanPhone}@acainograu.app`;

      const { error } = await register(
        email,
        data.password,
        verifiedData.name,
        verifiedData.phone
      );

      if (error) {
        toast.error(error.message || 'Erro ao criar conta');
        return;
      }

      // Atualizar customer com endereço e data de nascimento
      // Isso será feito após o login automático pelo trigger do Supabase

      setSuccessModal({
        open: true,
        title: <>Bem-vindo,<br /><span className="font-bold">{verifiedData.name}! 👋</span></>
      });

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);

    } catch (error: any) {
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${signupStep >= step
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
            }`}
        >
          {signupStep > step ? <CheckCircle className="w-4 h-4" /> : step}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 rounded-full"
        onClick={() => {
          if (signupStep > 1) {
            setSignupStep(prev => (prev - 1) as 1 | 2 | 3);
          } else {
            navigate('/');
          }
        }}
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>

      <Card className="w-full max-w-md p-6">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup" onClick={() => setSignupStep(1)}>Criar Conta</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent value="login">
            <div className="text-center mb-6">
              <Phone className="w-12 h-12 mx-auto text-primary mb-2" />
              <h2 className="text-xl font-semibold">Entre com seu WhatsApp</h2>
              <p className="text-muted-foreground text-sm">Use o telefone cadastrado</p>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(11) 98888-8888"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* SIGNUP TAB */}
          <TabsContent value="signup">
            {renderStepIndicator()}

            {/* STEP 1: Nome e WhatsApp */}
            {signupStep === 1 && (
              <>
                <div className="text-center mb-6">
                  <User className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h2 className="text-xl font-semibold">Vamos começar!</h2>
                  <p className="text-muted-foreground text-sm">Informe seu nome e WhatsApp</p>
                </div>

                <Form {...step1Form}>
                  <form onSubmit={step1Form.handleSubmit(handleStep1)} className="space-y-4">
                    <FormField
                      control={step1Form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="João Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step1Form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="(11) 98888-8888"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Código
                    </Button>
                  </form>
                </Form>
              </>
            )}

            {/* STEP 2: Verificar Código */}
            {signupStep === 2 && (
              <>
                <div className="text-center mb-6">
                  <Phone className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h2 className="text-xl font-semibold">Verificar WhatsApp</h2>
                  <p className="text-muted-foreground text-sm">
                    Digite o código enviado para<br />
                    <span className="font-medium text-foreground">{verifiedData?.phone}</span>
                  </p>
                </div>

                <Form {...step2Form}>
                  <form onSubmit={step2Form.handleSubmit(handleStep2)} className="space-y-6">
                    <FormField
                      control={step2Form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verificar
                    </Button>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResendCode}
                        disabled={countdown > 0 || isLoading}
                      >
                        {countdown > 0
                          ? `Reenviar em ${countdown}s`
                          : 'Reenviar código'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            )}

            {/* STEP 3: Endereço e Dados Adicionais */}
            {signupStep === 3 && (
              <>
                <div className="text-center mb-6">
                  <MapPin className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h2 className="text-xl font-semibold">Quase lá!</h2>
                  <p className="text-muted-foreground text-sm">Complete seu cadastro</p>
                </div>

                <Form {...step3Form}>
                  <form onSubmit={step3Form.handleSubmit(handleStep3)} className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={step3Form.control}
                        name="address.street"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua das Flores" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step3Form.control}
                        name="address.number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nº</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={step3Form.control}
                        name="address.complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input placeholder="Apto 101" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step3Form.control}
                        name="address.neighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input placeholder="Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={step3Form.control}
                      name="address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step3Form.control}
                      name="birthdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step3Form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (opcional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={step3Form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step3Form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Conta
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <FeedbackModal
        isOpen={successModal.open}
        onOpenChange={(open) => setSuccessModal(prev => ({ ...prev, open }))}
        title={successModal.title}
      />
    </div>
  );
}
