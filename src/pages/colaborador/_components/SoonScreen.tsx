/**
 * Tela-placeholder padronizada para seções do app do colaborador ainda em
 * construção (serão implementadas nos próximos blocos do redesenho).
 */

import type { LucideIcon } from 'lucide-react';

export function SoonScreen({ title, subtitle, Icon }: { title: string; subtitle?: string; Icon: LucideIcon }) {
  return (
    <div className="min-h-screen">
      <header className="rounded-b-[28px] bg-[#7C3AED] px-5 pb-8 pt-7 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-md px-5 pt-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10">
          <Icon className="h-8 w-8" />
        </div>
        <p className="mt-4 font-semibold text-gray-900 dark:text-white">Em breve</p>
        <p className="mt-1 text-sm text-gray-400">{subtitle ?? 'Esta seção está sendo preparada.'}</p>
      </div>
    </div>
  );
}
