/**
 * CheckGrau App — layout das telas com abas (Início/Tarefas/Histórico/Perfil).
 * Renderiza o conteúdo com a barra inferior fixa e o menu lateral (Perfil).
 * Telas de execução/detalhe ficam fora deste layout (tela cheia, sem abas).
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from './_components/TabBar';
import { SideMenu } from './_components/SideMenu';

export default function TabbedLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F14]">
      <div className="pb-20">
        <Outlet />
      </div>
      <TabBar onProfilePress={() => setMenuOpen(true)} profileActive={menuOpen} />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
