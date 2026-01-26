import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCustomerProfile, useUpdateCustomerProfile } from '@/hooks/useCustomerProfile';
import { AddressManagement } from '@/components/customer/AddressManagement';
import { useFavorites } from '@/hooks/useFavorites';
import { User, MapPin, Heart, Clock, LogOut } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { getStoreAwareRoute } = useCart();
  const [customerId, setCustomerId] = useState<string>();

  const { data: profile } = useCustomerProfile(user?.id);
  const updateProfile = useUpdateCustomerProfile();
  const { data: favorites } = useFavorites(customerId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (user) {
      const fetchOrCreateCustomer = async () => {
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setCustomerId(data.id);
        } else {
          // Criar customer automaticamente se não existir
          console.log("Criando perfil de customer para usuário existente...");
          const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
              phone: user.user_metadata?.phone || null
            })
            .select('id')
            .single();

          if (newCustomer) {
            setCustomerId(newCustomer.id);
            toast.success("Perfil de cliente ativado com sucesso!");
          } else {
            console.error("Erro ao criar customer:", error);
          }
        }
      };

      fetchOrCreateCustomer();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setBirthDate(profile.birth_date || '');
    }
  }, [profile]);

  if (!user) {
    return ( // ... (mantido igual, mas o diff cuidará da posição)
      <div className="min-h-screen bg-background pb-20">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-8">Perfil</h1>
          <Card className="p-8 text-center">
            <User className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Faça login para acessar seu perfil</p>
            <Button onClick={() => navigate('/auth')}>Fazer Login</Button>
          </Card>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const handleSave = async () => {
    if (!customerId) {
      toast.error("Erro ao identificar seu perfil de cliente. Tente recarregar a página.");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        customerId,
        data: {
          name,
          phone,
          birth_date: birthDate || null,
        },
      });
      toast.success("Dados atualizados com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar dados.");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">
              <User className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="w-4 h-4 mr-2" />
              Endereços
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Clock className="w-4 h-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="w-4 h-4 mr-2" />
              Favoritos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Dados Pessoais</h3>
              <div className="space-y-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email} disabled />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleSave} disabled={updateProfile.isPending}>
                  Salvar Alterações
                </Button>
              </div>

              {profile && (
                <div className="mt-6 pt-6 border-t space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Pedidos:</strong> {profile.total_orders}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Total gasto:</strong> R$ {profile.total_spent.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Pontos:</strong> {profile.loyalty_points}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            {customerId && <AddressManagement customerId={customerId} />}
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-6 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Veja o histórico completo de pedidos</p>
              <Button onClick={() => navigate('/orders')}>Ver Pedidos</Button>
            </Card>
          </TabsContent>

          <TabsContent value="favorites">
            {favorites && favorites.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {favorites.map((fav) => (
                  <Card key={fav.id} className="p-4">
                    <img
                      src={fav.product?.base_image_url || '/placeholder.svg'}
                      alt={fav.product?.name}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <p className="font-medium text-sm">{fav.product?.name}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Você ainda não tem favoritos</p>
                <Button onClick={() => navigate(getStoreAwareRoute())}>Explorar Produtos</Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNavigation />

      <div className="mt-8 mb-24 text-center">
        <p className="text-xs text-muted-foreground">
          Versão {__APP_VERSION__} ({new Date(__BUILD_DATE__).toLocaleDateString()})
        </p>
        <Button
          variant="link"
          size="sm"
          className="text-xs text-muted-foreground h-auto p-0 mt-1"
          onClick={async () => {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.update();
              toast.info("Verificando atualizações...");
            } else {
              window.location.reload();
            }
          }}
        >
          Verificar Atualizações
        </Button>
      </div>
    </div>
  );
};

export default Profile;