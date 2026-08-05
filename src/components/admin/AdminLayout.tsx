import { ReactNode, useState, useRef, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
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
import { usePrinter } from '@/contexts/PrinterContext';
import { generateEscPosCommand } from '@/utils/printing/escpos';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { Theme } from '@/components/ui/theme';
import { useUpdateStore } from '@/hooks/useStores';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { ManualProvider, useManual } from '@/contexts/ManualContext';
import { MobileBottomNav } from './MobileBottomNav';
import { cn } from '@/lib/utils';
import { OperationalManualDrawer } from './OperationalManualDrawer';
import { HelpCircle } from 'lucide-react';
import { WorkspaceTabs } from './WorkspaceTabs';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayoutContext = createContext<boolean>(false);

export function AdminLayout({ children }: AdminLayoutProps) {
  const isNested = useContext(AdminLayoutContext);

  if (isNested) {
    return <>{children}</>;
  }

  return (
    <AdminLayoutContext.Provider value={true}>
      <ManualProvider>
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </ManualProvider>
    </AdminLayoutContext.Provider>
  );
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { signOut, user } = useAuth();
  const { currentStore, refreshStores } = useStore();
  const updateStore = useUpdateStore();
  const { isOpen, toggleManual } = useManual();
  const location = useLocation();

  // Ativar Web Push Notifications globalmente
  usePushNotifications(currentStore?.id);

  const updateStatus = useUpdateOrderStatus();

  // Estados para impressão e novo pedido
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optimistic UI for store status
  const [localStatus, setLocalStatus] = useState<boolean | null>(null);

  useEffect(() => {
    if (currentStore) {
      setLocalStatus(currentStore.status === 'active');
    }
  }, [currentStore]);

  const handleStatusToggle = (checked: boolean) => {
    if (!currentStore) return;

    // Immediate visual update (Optimistic)
    setLocalStatus(checked);

    updateStore.mutate(
      {
        id: currentStore.id,
        updates: {
          active: true, // Always keep it visible/active in the system
          status: checked ? 'active' : 'inactive' // Only toggle status
        }
      },
      {
        onSuccess: async () => {
          // Refresh global context to ensure data consistency
          await refreshStores();
        },
        onError: () => {
          // Revert on error
          setLocalStatus(!checked);
          toast.error("Não foi possível atualizar o status da loja.");
        }
      }
    );
  };

  const handleLogout = async () => {
    setShowLogoutModal(true);
    setTimeout(async () => {
      await signOut();
      setShowLogoutModal(false);
    }, 2000);
  };

  const { isPlayingSound, stopSound, newOrderForDialog, clearNewOrder } = useRealtimeOrders();
  const { printRaw, isConnected, connect } = usePrinter();

  // Try to connect to printer silently when entering Admin Panel
  useEffect(() => {
    connect(true);
  }, []);

  const handlePrint = async () => {
    if (!orderToPrint || !currentStore) {
      console.error('❌ Dados para impressão não disponíveis');
      return;
    }

    // Tentar impressão térmica via QZ Tray primeiro
    if (isConnected) {
      try {
        // Mapear estrutura do pedido para o formato do gerador ESC/POS
        const escPosOrder: any = {
          ...orderToPrint,
          items: orderToPrint.items.map((i: any) => ({
            quantity: i.quantity,
            name: i.product?.name || 'Produto',
            subtotal: i.subtotal,
            size: i.product_size?.name, // Adjusted from 'size' to 'product_size' based on the select query
            notes: i.notes,
            toppings: i.toppings?.map((t: any) => ({
              name: t.topping?.name,
              price: t.price || t.unit_price
            })) || []
          }))
        };

        const commands = generateEscPosCommand(escPosOrder, currentStore.name);
        await printRaw(commands);
        toast.success("Enviado para impressora térmica!");
        setShowPrintDialog(false); // Fecha o modal após enviar
        setOrderToPrint(null);
        return;
      } catch (error) {
        console.error("Falha na impressão térmica:", error);
        toast.error("Erro na impressão térmica. Tentando método padrão...");
        // Fallback continues below
      }
    }

    // Fallback: Janela de Impressão do Navegador (Código original)
    if (!printRef.current) return;

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
  if (!isMounted) return null;

  const isIndependent = [
    '/admin/performance',
    '/admin/assistente',
    '/admin/comunidade',
    '/admin/checkgrau',
    '/admin/financeiro',
    '/admin/frota',
    '/admin/orders/catalog',
    '/admin/orders/products'
  ].some(prefix => location.pathname.startsWith(prefix));

  if (isIndependent) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-zinc-50 dark:bg-zinc-950/20 animate-fade-in workspace-independent-wrapper">
        <style>{`
          .workspace-independent-wrapper aside {
            top: 2.75rem !important;
            height: calc(100vh - 2.75rem) !important;
            z-index: 30 !important;
          }
        `}</style>
        <WorkspaceTabs />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger />

              {/* Status da Loja (Aligned Left) */}
              {currentStore && localStatus !== null && (
                <div className="flex items-center gap-3 bg-muted/40 hover:bg-muted/60 transition-colors px-3 py-1.5 rounded-full border border-border/40">
                  <Switch
                    checked={localStatus}
                    onCheckedChange={handleStatusToggle}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <div className="flex flex-col items-start select-none cursor-pointer" onClick={() => handleStatusToggle(!localStatus)}>
                    <span className={`text-sm font-semibold leading-none ${localStatus ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {localStatus ? 'Loja Aberta' : 'Loja Fechada'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleManual}
                className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Ajuda</span>
              </Button>

              {/* Indicador de som tocando */}
              {isPlayingSound && (
                <Badge className="animate-pulse-border bg-red-500 hover:bg-red-600 text-white px-3 py-1 cursor-pointer mr-2" onClick={stopSound}>
                  🔊 Parar Som
                </Badge>
              )}

              <Theme variant="button" size="sm" />
              <StoreSelector />
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-block text-sm text-muted-foreground">{user?.email}</span>
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

          <WorkspaceTabs />

          <main className={cn('flex-1 p-6 overflow-auto', isMobile && 'pb-20')}>
            {children}
          </main>
        </div>
      </div>

      {isMobile && <MobileBottomNav />}

      {/* Alerta global de novo pedido de franquia agora vive na raiz do App
          (App.tsx, via GlobalFranchiseeOrderAlert) — funciona em qualquer
          rota, mesmo as que não usam este layout (ex: /admin/hub). */}

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
                toast.error('Erro: Pedido sem itens. Não é possível imprimir.');
                clearNewOrder();
                return;
              }

              if (!currentStore) {
                toast.error('Erro: Dados da loja não disponíveis.');
                clearNewOrder();
                return;
              }

              // IMPRESSÃO AUTOMÁTICA AO ACEITAR
              if (isConnected) {
                try {
                  // Mapear estrutura
                  const escPosOrder: any = {
                    ...fullOrder,
                    items: fullOrder.items.map((i: any) => ({
                      quantity: i.quantity,
                      name: i.product?.name || 'Produto',
                      subtotal: i.subtotal,
                      size: i.product_size?.name,
                      notes: i.notes,
                      toppings: i.toppings?.map((t: any) => ({
                        name: t.topping?.name,
                        price: t.price || t.unit_price
                      })) || []
                    }))
                  };

                  const commands = generateEscPosCommand(escPosOrder, currentStore.name);
                  await printRaw(commands);
                  toast.success("Pedido aceito e enviado para impressora! 🖨️");
                } catch (err) {
                  console.error("Erro ao imprimir automaticamente:", err);
                  // Se falhar a térmica, avisa mas não bloqueia o fluxo
                  toast.error("Pedido aceito, mas falha na impressão automática.");

                  // Opcional: Mostrar diálogo de print manual como fallback?
                  setOrderToPrint(fullOrder);
                  setShowPrintDialog(true);
                  clearNewOrder();
                  return;
                }
              } else {
                // Se não tiver impressora conectada, mostra diálogo manual
                setOrderToPrint(fullOrder);
                setShowPrintDialog(true);
                clearNewOrder();
                return;
              }
            }

            clearNewOrder();
          }
        }}
        onClose={clearNewOrder}
      />

      {/* Global Print Dialog - Fallback Only */}
      <AlertDialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">✅ Pedido Aceito!</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Impressora térmica não detectada. Deseja imprimir manualmente?
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
        <OperationalManualDrawer isOpen={isOpen} onOpenChange={toggleManual} />
    </SidebarProvider>
  );
}
