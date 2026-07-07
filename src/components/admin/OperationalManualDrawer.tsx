'use client'

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ShoppingCart, 
  Truck, 
  DollarSign, 
  BookOpen, 
  MousePointer2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Maximize2,
  Package,
  GraduationCap,
  Settings,
  Printer,
  ShieldCheck,
  ChevronRight,
  Info,
  Clock,
  MapPin,
  Scale,
  Users,
  TrendingUp,
  Target,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mockup Images
import mockupPdv from '@/assets/manual/mockup_pdv.png';
import mockupDelivery from '@/assets/manual/mockup_delivery.png';
import mockupFinancial from '@/assets/manual/mockup_financial.png';

interface OperationalManualDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperationalManualDrawer({ isOpen, onOpenChange }: OperationalManualDrawerProps) {
  const [activeTab, setActiveTab] = useState('pdv');

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-[750px] p-0 border-l border-white/20 bg-white/95 backdrop-blur-3xl shadow-2xl">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-8 pb-4 border-b bg-gradient-to-br from-purple-600/5 to-orange-500/5">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20 backdrop-blur-xl">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-3xl font-black text-gradient tracking-tight">
                  Enciclopédia GrauOS
                </SheetTitle>
                <SheetDescription className="text-zinc-500 font-medium text-base">
                  O guia definitivo para o sucesso operacional da sua unidade.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 py-3 border-b bg-white/40 overflow-x-auto">
              <TabsList className="flex h-12 bg-zinc-100/80 p-1 min-w-max gap-1">
                <TabsTrigger value="pdv" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <ShoppingCart className="h-4 w-4" /> Frente de Caixa
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <Truck className="h-4 w-4" /> Delivery/KDS
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <DollarSign className="h-4 w-4" /> Gestão Financeira
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <Package className="h-4 w-4" /> Estoque/Insumos
                </TabsTrigger>
                <TabsTrigger value="support" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <Settings className="h-4 w-4" /> Configs/Suporte
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-8">
              <AnimatePresence mode="wait">
                <TabsContent value="pdv" className="py-8 mt-0 animate-in fade-in duration-500 slide-in-from-right-5">
                  <div className="space-y-10">
                    <section className="relative group overflow-hidden rounded-[2.5rem] border-2 border-primary/10 shadow-3xl">
                      <img src={mockupPdv} alt="PDV Mockup" className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                        <p className="text-white text-sm font-medium blur-0">A interface mais rápida do mercado para vendas em balcão.</p>
                      </div>
                    </section>

                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="h-1 w-12 bg-primary rounded-full" />
                        <h3 className="text-2xl font-black text-gradient-primary tracking-tight">1. Fluxo de Venda (PDV)</h3>
                      </div>

                      <Accordion type="single" collapsible className="w-full space-y-3">
                        <AccordionItem value="item-1" className="border rounded-2xl px-5 bg-zinc-50/50">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">01</div>
                                <span className="font-bold text-zinc-800">Seleção e Catálogo</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="text-zinc-600 leading-relaxed pb-6 space-y-4">
                            Navegue pelas categorias superiores ou utilize a **Barra de Busca** (superior esquerda). O sistema aceita busca por Nome, Descrição ou SKU (código do produto). 
                            <div className="p-4 bg-white border rounded-xl shadow-sm text-sm">
                              <strong>Dica de Mestre:</strong> Use o botão de <strong>Maximize</strong> para ocultar os menus e focar 100% na operação da tela.
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="border rounded-2xl px-5 bg-zinc-50/50">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">02</div>
                                <span className="font-bold text-zinc-800">Modais Inteligentes (Peso/Adicionais)</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="text-zinc-600 leading-relaxed pb-6 space-y-4">
                            Ao clicar em um produto cadastrado como **"A Granel/Peso"**, o GrauOS abre automaticamente o **WeightInputModal**.
                            <ul className="mt-3 space-y-2 list-disc pl-5">
                              <li>Insira o peso em gramas (ex: 500g).</li>
                              <li>O valor é calculado em tempo real com base no preço/kg.</li>
                              <li>Produtos unitários abrem o modal de **Complementos**, onde você seleciona coberturas e frutas.</li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border rounded-2xl px-5 bg-zinc-50/50">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">03</div>
                                <span className="font-bold text-zinc-800">Pagamento e Emissão</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="text-zinc-600 leading-relaxed pb-6 space-y-3">
                            <p>Clique em **"Receber Pagamento"** para escolher entre: Dinheiro, Pix, Cartão de Crédito ou Débito.</p>
                            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-900 text-sm italic">
                              <Printer className="h-5 w-5 shrink-0" />
                              "Se a impressão estiver configurada no QZ Tray, o cupom sairá no ato da confirmação do pagamento."
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-[2rem] bg-zinc-900 text-white flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                          <Scale className="absolute -right-4 -top-4 h-24 w-24 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
                          <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Regra de Ouro</h4>
                          <p className="text-sm font-medium leading-relaxed">Sempre confira o peso na balança antes de digitar o valor. O GrauOS não aceita valores negativos ou zerados para produtos a granel.</p>
                        </div>
                        <div className="p-5 rounded-[2rem] bg-primary text-white flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                          <ShieldCheck className="absolute -right-4 -top-4 h-24 w-24 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
                          <h4 className="text-xs font-bold uppercase tracking-widest text-white/60">Segurança</h4>
                          <p className="text-sm font-medium leading-relaxed">Utilize o campo **"Cliente (Opcional)"** para fidelizar o público e facilitar a localização do pedido no KDS.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="py-8 mt-0 animate-in fade-in duration-500 slide-in-from-right-5">
                  <div className="space-y-10">
                    <section className="relative rounded-[2.5rem] border-2 border-blue-500/10 overflow-hidden shadow-3xl">
                      <img src={mockupDelivery} alt="Delivery Mockup" className="w-full h-auto" />
                    </section>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-1 w-12 bg-blue-500 rounded-full" />
                        <h3 className="text-2xl font-black text-gradient tracking-tight">Manual Logístico</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="flex gap-4 items-start p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem]">
                          <div className="h-10 w-10 shrink-0 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-blue-900">Alertas em Tempo Real</h4>
                            <p className="text-sm text-zinc-600">Pedidos vindos do Aplicativo ou Link de Vendas disparam um sinal sonoro e visual na coluna **"Pendente"**. Você tem 5 minutos para aceitar antes que o sistema alerte o cliente sobre atraso.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <section className="space-y-4">
                            <h4 className="font-black text-zinc-800 flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-500" />
                              Roteirização
                            </h4>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                              Ao passar um pedido para **"Pronto"**, o sistema vincula o endereço ao **Google Maps**. Clique no ícone de localização para ver a rota otimizada para o entregador.
                            </p>
                          </section>
                          <section className="space-y-4">
                            <h4 className="font-black text-zinc-800 flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              Motoboys
                            </h4>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                              No momento de despachar (**Out for Delivery**), selecione o motorista disponível no modal. Isso facilitará o acerto de contas financeiro no fim do turno.
                            </p>
                          </section>
                        </div>

                        <div className="bg-white border rounded-3xl overflow-hidden">
                          <div className="p-4 bg-zinc-100/50 border-b flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-zinc-500">
                            <Info className="h-4 w-4" /> Legenda de Status kds
                          </div>
                          <div className="grid grid-cols-2 divide-x border-b">
                            <div className="p-4 flex flex-col gap-1 items-center text-center">
                              <span className="w-full text-xs font-bold text-orange-500 uppercase">Confirmado</span>
                              <span className="text-[10px] text-zinc-400">Cupom Impresso e Aceite do Gerente</span>
                            </div>
                            <div className="p-4 flex flex-col gap-1 items-center text-center">
                              <span className="w-full text-xs font-bold text-blue-500 uppercase">Preparando</span>
                              <span className="text-[10px] text-zinc-400">Na montagem ou cozinha</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x">
                            <div className="p-4 flex flex-col gap-1 items-center text-center">
                              <span className="w-full text-xs font-bold text-green-500 uppercase">Pronto</span>
                              <span className="text-[10px] text-zinc-400">Aguardando retirada de Balcão/Rua</span>
                            </div>
                            <div className="p-4 flex flex-col gap-1 items-center text-center">
                              <span className="w-full text-xs font-bold text-purple-500 uppercase">A Caminho</span>
                              <span className="text-[10px] text-zinc-400">Entregador em trânsito</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="py-8 mt-0 animate-in fade-in duration-500 slide-in-from-right-5">
                  <div className="space-y-10">
                    <section className="relative rounded-[2.5rem] border-2 border-green-500/10 overflow-hidden shadow-3xl">
                      <img src={mockupFinancial} alt="Financial Mockup" className="w-full h-auto" />
                    </section>

                    <div className="space-y-8">
                       <div className="flex items-center gap-3">
                        <div className="h-1 w-12 bg-green-500 rounded-full" />
                        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Gestão da Saúde Financeira</h3>
                      </div>

                      <div className="grid gap-4">
                        {[
                          { 
                            title: 'Fluxo de Caixa', 
                            desc: 'Onde você lança manualmente despesas extras (ex: gás, limpeza) e suprimentos (fundo de troco).',
                            icon: DollarSign,
                            color: 'text-green-600',
                            bg: 'bg-green-50'
                          },
                          { 
                            title: 'DRE Operacional', 
                            desc: 'Demonstrativo de Resultado. Aqui você subtrai os custos de venda, impostos e fixos para ver o **Lucro Líquido** real.',
                            icon: TrendingUp,
                            color: 'text-blue-600',
                            bg: 'bg-blue-50'
                          },
                          { 
                            title: 'Configurações de Metas', 
                            desc: 'Defina quanto sua unidade deve faturar por semana. O Dashboard mostrará a barra de progresso em tempo real.',
                            icon: Target,
                            color: 'text-orange-600',
                            bg: 'bg-orange-50'
                          }
                        ].map((card, i) => (
                          <div key={i} className="flex gap-5 p-6 rounded-[2.5rem] bg-white border border-zinc-100 hover:border-primary/20 hover:shadow-lg transition-all group">
                            <div className={`h-14 w-14 shrink-0 rounded-3xl ${card.bg} flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform`}>
                              <card.icon className="h-7 w-7" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-black text-lg text-zinc-800">{card.title}</h4>
                                <p className="text-sm text-zinc-500 leading-relaxed">{card.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-zinc-900 text-white space-y-4">
                        <h4 className="text-primary font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          Checklist de Fechamento de Caixa
                        </h4>
                        <ul className="space-y-3">
                          <li className="flex gap-3 text-sm text-zinc-300">
                             <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                             Conferência de todos os cartões (POS vs GrauOS).
                          </li>
                          <li className="flex gap-3 text-sm text-zinc-300">
                             <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                             Lançamento de Sangrias (retiradas excessivas de dinheiro).
                          </li>
                          <li className="flex gap-3 text-sm text-zinc-300">
                             <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                             Conferência do fundo de troco para o turno seguinte.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="py-8 mt-0 animate-in fade-in duration-500 slide-in-from-right-5">
                   <div className="space-y-10">
                    <div className="h-64 rounded-[2.5rem] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border-2 border-indigo-100 border-dashed relative group overflow-hidden">
                       <Package className="h-24 w-24 text-indigo-200 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
                       <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                         <h4 className="font-black text-xl text-indigo-900 mb-2 font-['Geist_Sans']">Controle de Insumos</h4>
                         <p className="text-sm text-zinc-500 text-center max-w-sm">Mantenha sua loja sempre abastecida com a inteligência GrauOS de estoque.</p>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg">
                          <Activity className="h-5 w-5" />
                        </div>
                        <h3 className="text-2xl font-black text-zinc-900">Gestão de Estoque e Compras</h3>
                      </div>

                      <div className="space-y-4">
                        <p className="text-zinc-600 leading-relaxed italic">
                          "O sistema automatiza a baixa do estoque com base nas fichas técnicas dos seus produtos (ex: cada açaí vendido retira 250g de insumo bruto)."
                        </p>

                        <Accordion type="single" collapsible className="w-full space-y-4">
                          <AccordionItem value="inv-1" className="border-0 bg-white shadow-sm rounded-3xl overflow-hidden">
                            <AccordionTrigger className="px-6 py-5 hover:no-underline bg-white">
                              <span className="font-bold text-zinc-800">1. Cadastro de Insumos (Matéria-Prima)</span>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 text-sm text-zinc-500 space-y-3">
                              Cadastre aqui tudo que você compra para a loja: Caixas de Açaí, Sacos de Granola, Frutas, Embalagens.
                              <strong>Importante:</strong> Defina o "Estoque Mínimo". Quando o item atingir este nível, você receberá um alerta visual.
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="inv-2" className="border-0 bg-white shadow-sm rounded-3xl overflow-hidden">
                            <AccordionTrigger className="px-6 py-5 hover:no-underline bg-white">
                              <span className="font-bold text-zinc-800">2. Controle de Perdas</span>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 text-sm text-zinc-500">
                              Não esqueça de registrar avarias ou produtos vencidos. Isso mantém seu DRE preciso e evita a falsa sensação de lucro.
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>

                      <div className="p-6 bg-indigo-900 rounded-[2.5rem] relative overflow-hidden group">
                        <GraduationCap className="h-32 w-32 absolute -right-8 -bottom-8 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
                        <h4 className="text-indigo-400 font-bold mb-2">Universidade no Grau</h4>
                        <p className="text-white text-sm leading-relaxed max-w-sm">Dúvidas sobre como fazer a ficha técnica perfeita? Acesse o módulo **Universidade** para assistir aos vídeos tutoriais da franqueadora.</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="support" className="py-8 mt-0 animate-in fade-in duration-500 slide-in-from-right-5">
                   <div className="space-y-8">
                      <div className="text-center space-y-3">
                         <div className="h-20 w-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4">
                            <Printer className="h-10 w-10 text-primary" />
                         </div>
                         <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Suporte Técnico</h3>
                         <p className="text-zinc-500">Resolvendo problemas comuns com agilidade.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section className="p-6 bg-zinc-50 border rounded-3xl space-y-4">
                           <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                             <Settings className="h-4 w-4 text-primary" />
                             Configuração de Impressora
                           </h4>
                           <p className="text-xs text-zinc-600 leading-relaxed">
                             O GrauOS utiliza tecnologia **QZ Tray**. Se a impressora não responder:
                             <br/><br/>
                             1. Verifique se o QZ Tray está aberto no seu Windows/Mac.
                             <br/>
                             2. No painel de Configurações do PDV, clique em "Conectar Impressora".
                             <br/>
                             3. Certifique-se de que a impressora térmica é a padrão do sistema.
                           </p>
                        </section>

                        <section className="p-6 bg-zinc-50 border rounded-3xl space-y-4">
                           <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                             <ShieldCheck className="h-4 w-4 text-primary" />
                             Segurança e Acessos
                           </h4>
                           <p className="text-xs text-zinc-600 leading-relaxed">
                             Funcionários (Staff) não têm acesso aos módulos **Financeiro** e **Gestão de Franquia**. Caso precise alterar permissões, solicite ao Master Admin da unidade.
                             <br/><br/>
                             <strong>Dica:</strong> Troque sua senha a cada 90 dias no seu Perfil.
                           </p>
                        </section>
                      </div>

                      <div className="bg-primary/5 p-8 rounded-[3rem] text-center border border-primary/10">
                        <p className="text-sm text-zinc-700 font-medium mb-4">Ainda com dúvidas? Fale diretamente com o suporte da central</p>
                        <Button className="rounded-full px-10 h-14 font-bold bg-[#25D366] hover:bg-[#128C7E] text-white gap-2">
                           Falar no WhatsApp Suporte
                        </Button>
                      </div>
                   </div>
                </TabsContent>
              </AnimatePresence>
            </ScrollArea>

            <div className="p-8 border-t bg-zinc-50/50 backdrop-blur-md">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                <span>© 2026 Açaí no Grau Franchising</span>
                <span className="bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">v3.0.0 (Ultimate Edition)</span>
              </div>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
