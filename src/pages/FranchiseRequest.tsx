import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useCreateFranchiseeRequest } from '@/hooks/useFranchiseeRequests';
import logoAcai from '@/assets/logo-acai.png';
import { z } from 'zod';
import { toast } from 'sonner';

const franchiseSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  phone: z.string().regex(/^\(?[0-9]{2}\)?\s?[0-9]{4,5}-?[0-9]{4}$/, 'Formato de telefone inválido'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres').max(100, 'Cidade muito longa'),
  state: z.string().length(2, 'Estado deve ter 2 letras').regex(/^[A-Z]{2}$/, 'Estado deve ser em maiúsculas'),
  store_name: z.string().min(3, 'Nome da loja deve ter pelo menos 3 caracteres').max(150, 'Nome da loja muito longo'),
  preferred_slug: z.string().min(3, 'URL muito curta').max(50, 'URL muito longa').regex(/^[a-z0-9-]+$/, 'URL deve conter apenas letras minúsculas, números e hífens'),
  message: z.string().max(1000, 'Mensagem muito longa (máximo 1000 caracteres)').optional(),
});

const FranchiseRequest = () => {
  const navigate = useNavigate();
  const createRequest = useCreateFranchiseeRequest();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    store_name: '',
    preferred_slug: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = franchiseSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    await createRequest.mutateAsync(formData);
    navigate('/');
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleStoreNameChange = (value: string) => {
    setFormData({
      ...formData,
      store_name: value,
      preferred_slug: generateSlug(value),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <Card className="p-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src={logoAcai}
              alt="Açaí no Grau"
              className="w-32 h-32 object-contain mb-4"
            />
            <h1 className="text-3xl font-bold text-center mb-2">
              Seja um Franqueado
            </h1>
            <p className="text-muted-foreground text-center">
              Preencha o formulário abaixo para solicitar sua franquia
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                required
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  required
                  maxLength={2}
                  placeholder="PI"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      state: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_name">Nome da Loja *</Label>
              <Input
                id="store_name"
                required
                placeholder="Ex: Açaí no Grau - Dirceu"
                value={formData.store_name}
                onChange={(e) => handleStoreNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_slug">URL da Loja *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  pedegrau.lovable.app/delivery/
                </span>
                <Input
                  id="preferred_slug"
                  required
                  value={formData.preferred_slug}
                  onChange={(e) =>
                    setFormData({ ...formData, preferred_slug: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Este será o endereço único da sua loja
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                rows={4}
                placeholder="Conte-nos um pouco sobre você e por que deseja ser um franqueado..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default FranchiseRequest;
