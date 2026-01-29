import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Minus, Plus, X, ShoppingCart, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackModal } from '@/components/common/FeedbackModal';

export default function Cart() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { items, subtotal, updateQuantity, removeItem, clearCart, getStoreAwareRoute } = useCart();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b safe-area-top" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">Meu Carrinho</h1>
              <div className="w-10" /> {/* Spacer for alignment */}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 min-h-[60vh]">
          <ShoppingCart className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h1>
          <p className="text-muted-foreground mb-6 text-center">
            Adicione produtos do cardápio para começar seu pedido
          </p>
          <Button
            onClick={() => {
              const route = getStoreAwareRoute() || '/menu';
              console.log("Navigating to:", route);
              navigate(route);
            }}
            size="lg"
            className="bg-primary hover:bg-primary/90 rounded-full h-12 px-8 font-semibold"
          >
            Ver Cardápio
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    setIsLogoutModalOpen(true);
    // Fechar automaticamente após 2 segundos e redirecionar
    setTimeout(() => {
      setIsLogoutModalOpen(false);
      navigate('/menu');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b safe-area-top" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Meu Carrinho (v1.0.2)</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearCart}
              className="text-destructive"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Items */}
        <div className="space-y-4 mb-6">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                {item.product_image && (
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-bold leading-tight line-clamp-2">{item.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.size_name}
                        {item.size_ml && ` (${item.size_ml}ml)`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {item.toppings.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium">Adicionais:</p>
                      <ul className="text-sm text-muted-foreground">
                        {Object.values(item.toppings.reduce((acc, topping) => {
                          if (!acc[topping.id]) {
                            acc[topping.id] = { ...topping, count: 0 };
                          }
                          acc[topping.id].count += 1;
                          return acc;
                        }, {} as Record<string, typeof item.toppings[0] & { count: number }>)).map((topping, idx) => (
                          <li key={idx}>
                            <span className="font-semibold text-gray-900">{topping.count}x</span> {topping.name}
                            {topping.price > 0 && ` (R$ ${topping.price.toFixed(2)})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-sm text-muted-foreground italic mb-2">
                      Obs: {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="font-bold">R$ {item.subtotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Resumo do Pedido</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Taxa de entrega:</span>
              <span>Calcular no checkout</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold mb-6">
            <span>Total:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (!user) {
                setIsLoginModalOpen(true);
              } else {
                navigate('/checkout');
              }
            }}
          >
            Finalizar Pedido
          </Button>

          {user && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Logado como <span className="font-medium text-foreground">{user.email}</span></p>
              <Button
                variant="link"
                className="h-auto p-0 text-xs text-destructive hover:text-destructive/80 mt-1"
                onClick={handleLogout}
              >
                Não é você? Sair da conta
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Login Modal */}
      <FeedbackModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        title={<>Estamos quase lá! 😋</>}
        description="Faça login ou cadastre-se rapidinho para finalizarmos seu pedido."
      >
        <Button
          onClick={() => navigate('/auth', { state: { from: { pathname: '/checkout' } } })}
          className="w-full rounded-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Entrar ou Cadastrar
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setIsLoginModalOpen(false);
            navigate(getStoreAwareRoute());
          }}
          className="w-full rounded-full h-12 text-base font-medium"
        >
          Continuar comprando
        </Button>
      </FeedbackModal>

      {/* Logout Modal */}
      <FeedbackModal
        isOpen={isLogoutModalOpen}
        onOpenChange={setIsLogoutModalOpen}
        title={<>Logout realizado <br /><span className="font-bold">com sucesso!</span></>}
      />
    </div>
  );
}
