import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { PERFIL_INFO } from '@/lib/permissions';
import { APP_VERSION, APP_BUILD_NUMBER, APP_COMMIT } from '@/version';
import { cn } from '@/lib/utils';

function iniciais(nome: string | undefined, email: string | undefined): string {
  const base = nome?.trim() || email?.split('@')[0] || '?';
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile } = usePermissions();

  const nome = profile?.nome || user?.email || 'Usuário';
  const cargo = profile?.perfil ? PERFIL_INFO[profile.perfil]?.label : null;

  const avatar = (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {profile?.foto
        ? <img src={profile.foto} alt="" className="h-full w-full object-cover" />
        : iniciais(profile?.nome, user?.email)}
    </span>
  );

  const menu = (
    <DropdownMenuContent align="end" side="top" className="w-56">
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-medium">{nome}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => navigate('/admin/meu-perfil')}>
        <UserCircle className="mr-2 h-4 w-4" />
        Meu Perfil
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (collapsed) {
    return (
      <div className="flex justify-center border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Menu de ${nome}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {avatar}
          </DropdownMenuTrigger>
          {menu}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Menu de ${nome}`}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left',
            'transition-colors duration-[180ms] hover:bg-sidebar-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          )}
        >
          {avatar}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{nome}</span>
            {cargo && <span className="block truncate text-[11px] font-medium text-muted-foreground">{cargo}</span>}
          </span>
          <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>

      <p
        className="pt-2 text-center text-[10px] text-muted-foreground"
        title={`Build ${APP_BUILD_NUMBER} · ${APP_COMMIT}`}
      >
        GrauOS <span className="font-bold text-foreground">{APP_VERSION}</span>
      </p>
    </div>
  );
}
