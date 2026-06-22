import { Route as RouteIcon, History, User } from 'lucide-react';

export type MotoristaTab = 'rotas' | 'historico' | 'perfil';

interface BottomNavProps {
  active: MotoristaTab;
  onChange: (tab: MotoristaTab) => void;
}

const TABS: { id: MotoristaTab; label: string; icon: typeof RouteIcon }[] = [
  { id: 'rotas', label: 'Rotas', icon: RouteIcon },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'perfil', label: 'Perfil', icon: User },
];

// Bottom navigation fixa, padrão app nativo (referência 001.png/003.png) —
// 3 itens, destaque do ativo em pill suave roxo claro + ícone/texto roxo,
// safe area iOS no rodapé.
export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t safe-area-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
            >
              <div className={`px-4 py-1 rounded-full transition-colors ${isActive ? 'bg-violet-100' : ''}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-violet-600' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-[11px] font-semibold ${isActive ? 'text-violet-600' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
