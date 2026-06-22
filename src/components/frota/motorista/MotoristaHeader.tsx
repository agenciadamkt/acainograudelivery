import { Truck, LogOut, Power } from 'lucide-react';

interface MotoristaHeaderProps {
  nome: string;
  isOnline: boolean;
  onToggleOnline: () => void;
  onLogout: () => void;
}

// Header compacto — referência 001.png/003.png: faixa roxa baixa, avatar em
// badge translúcido, nome em destaque, subtítulo discreto, badge "Online" em
// pill e logout só como ícone (sem texto), tudo dentro da safe area iOS.
export function MotoristaHeader({ nome, isOnline, onToggleOnline, onLogout }: MotoristaHeaderProps) {
  return (
    <header className="bg-violet-600 text-white sticky top-0 z-20 safe-area-top">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Truck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[15px] leading-tight truncate">{nome}</p>
            <p className="text-[11px] text-violet-200 leading-tight">Controle de Frota</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-bold transition-colors ${
              isOnline
                ? 'bg-emerald-500 text-white'
                : 'bg-white/15 text-violet-100'
            }`}
          >
            <Power className="h-3 w-3" />
            {isOnline ? 'Online' : 'Offline'}
          </button>
          <button
            onClick={onLogout}
            className="h-7 w-7 rounded-full flex items-center justify-center text-violet-100 hover:bg-white/10 active:bg-white/20 transition-colors"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
