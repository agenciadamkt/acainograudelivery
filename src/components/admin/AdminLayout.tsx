import { ReactNode, useState, useRef } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { StoreSelector } from './StoreSelector';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { NewOrderDialog } from '@/components/admin/NewOrderDialog';
import { PrintableOrder } from '@/components/admin/PrintableOrder';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { Theme } from '@/components/ui/theme';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut, user } = useAuth();
  const { currentStore } = useStore();

  // Ativar Web Push Notifications globalmente
  usePushNotifications(currentStore?.id);

  const updateStatus = useUpdateOrderStatus();

  // Estados para impressão e novo pedido (movido de OrdersPage)
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setShowLogoutModal(true);
    setTimeout(async () => {
      await signOut();
      setShowLogoutModal(false);
    }, 2000);
  };

  const { isPlayingSound, stopSound, newOrderForDialog, clearNewOrder } = useRealtimeOrders();

  const handlePrint = () => {
    if (!printRef.current || !orderToPrint || !currentStore) {
      console.error('❌ Dados para impressão não disponíveis');
      return;
    }

    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      alert('Bloqueador de popup impediu a impressão. Permita popups para este site.');
      return;
    }

    // Copiar o HTML do componente printable
    const printContent = printRef.current.innerHTML;

    // Escrever HTML completo na nova janela
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pedido #${orderToPrint.order_number}</title>
          <style>
            @page {
              margin: 0;
              size: 80mm auto;
            }
            
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
            }
            
            .separator {
              border-top: 2px solid #000;
              margin: 10px 0;
            }
            
            .line {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            
            .text-center {
              text-align: center;
            }
            
            .font-bold {
              font-weight: bold;
            }
            
            .text-lg {
              font-size: 16px;
            }
            
            .text-sm {
              font-size: 11px;
            }
            
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mt-2 { margin-top: 8px; }
            .mt-6 { margin-top: 24px; }
            .ml-2 { margin-left: 8px; }
            .ml-4 { margin-left: 16px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            
            .flex {
              display: flex;
            }
            
            .justify-between {
              justify-content: space-between;
            }
            
            .text-muted-foreground {
              color: #666;
            }
            
            .italic {
              font-style: italic;
            }
            
            .whitespace-pre-wrap {
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Aguardar carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();

        // Fechar a janela após impressão
        setTimeout(() => {
          printWindow.close();
          setShowPrintDialog(false);
          setOrderToPrint(null);
        }, 500);
      }, 250);
    };
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />

            <div className="flex items-center justify-center flex-1">
              {/* Indicador de som tocando (movido para o header global) */}
              {isPlayingSound && (
                <Badge className="animate-pulse-border bg-primary text-primary-foreground px-4 py-1 cursor-pointer" onClick={stopSound}>
                  🔊 NOVO PEDIDO - Clique para parar som
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Theme variant="button" size="sm" />
              <StoreSelector />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global New Order Dialog */}
      <NewOrderDialog
        order={newOrderForDialog}
        isOpen={!!newOrderForDialog}
        onAccept={async () => {
          if (newOrderForDialog) {
            console.log('🔵 Iniciando processo de aceitar pedido...');

            // Confirmar pedido primeiro
            updateStatus.mutate({ orderId: newOrderForDialog.id, status: 'confirmed' });

            // Aguardar 500ms para garantir que o status foi atualizado
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('🔵 Buscando dados completos do pedido...');

            // Buscar pedido completo do banco com TODOS os campos
            const { data: fullOrder, error } = await supabase
              .from('orders')
              .select(`
                  *,
                  customer:customers(name, phone),
                  delivery_address:customer_addresses(*),
                  items:order_items(
                    *,
                    product:products(name),
                    product_size:product_sizes(name),
                    toppings:order_item_toppings(
                      *,
                      topping:toppings(name)
                    )
                  )
                `)
              .eq('id', newOrderForDialog.id)
              .single();

            if (error) {
              console.error('❌ Erro ao buscar pedido:', error);
              alert('Erro ao buscar dados do pedido: ' + error.message);
              clearNewOrder();
              return;
            }

            if (fullOrder) {
              if (!fullOrder.items || fullOrder.items.length === 0) {
                alert('Erro: Pedido sem itens. Não é possível imprimir.');
                clearNewOrder();
                return;
              }

              if (!currentStore) {
                alert('Erro: Dados da loja não disponíveis. Não é possível imprimir.');
                clearNewOrder();
                return;
              }

              setOrderToPrint(fullOrder);
              setShowPrintDialog(true);
            }

            clearNewOrder();
          }
        }}
        onClose={clearNewOrder}
      />

      {/* Global Print Dialog */}
      <AlertDialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">✅ Pedido Aceito com Sucesso!</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Pedido #{orderToPrint?.order_number} foi confirmado e está sendo preparado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90"
              size="lg"
            >
              🖨️ Imprimir Pedido
            </Button>
            <AlertDialogCancel onClick={() => {
              setShowPrintDialog(false);
              setOrderToPrint(null);
            }}>
              Fechar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Printable Order (hidden) */}
      {orderToPrint && currentStore && (
        <PrintableOrder
          ref={printRef}
          order={orderToPrint}
          store={currentStore as any}
        />
      )}
      {/* Logout Feedback Modal */}
      <FeedbackModal
        isOpen={showLogoutModal}
        onOpenChange={(open) => {
          if (!open) signOut(); // Se fechar manualmente, sai
          setShowLogoutModal(open);
        }}
        title={<>Logout realizado <br /><span className="font-bold">com sucesso!</span></>}
      />
    </SidebarProvider>
  );
}
