import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Perfil } from '@/lib/permissions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  foto: string | null;
  perfil: Perfil;
  unidade_id: string | null;
  ativo: boolean;
  is_protected: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
  stores?: { name: string } | null;
}

interface PermissionContextType {
  profile: UserProfile | null;
  permissions: Record<string, number>;
  isLoading: boolean;
  /** Retorna o nível (0–4) do usuário para o módulo */
  nivel: (moduloCodigo: string) => number;
  /** true se o usuário tem ao menos nivelMinimo no módulo */
  can: (moduloCodigo: string, nivelMinimo?: number) => boolean;
  reload: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading]   = useState(false);

  const load = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // 1. Perfil do usuário
      const { data: prof } = await (supabase as any)
        .from('user_profiles')
        .select('*, stores(name)')
        .eq('id', userId)
        .single();

      if (!prof) { setProfile(null); setPermissions({}); return; }
      setProfile(prof as UserProfile);

      // 2. Permissões padrão do perfil
      const { data: defaults } = await (supabase as any)
        .from('rbac_perfil_permissoes')
        .select('modulo_codigo, nivel')
        .eq('perfil', prof.perfil);

      // 3. Permissões customizadas do usuário
      const { data: custom } = await (supabase as any)
        .from('rbac_usuario_permissoes')
        .select('modulo_codigo, nivel')
        .eq('usuario_id', userId);

      // 4. Merge: defaults ← custom overrides
      const merged: Record<string, number> = {};
      (defaults || []).forEach((d: any) => { merged[d.modulo_codigo] = d.nivel; });
      (custom  || []).forEach((c: any) => { merged[c.modulo_codigo] = c.nivel; });

      setPermissions(merged);

      // 5. Atualiza ultimo_acesso
      await (supabase as any)
        .from('user_profiles')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', userId);

    } catch (err) {
      console.error('[PermissionContext] erro ao carregar:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      load(user.id);
    } else {
      setProfile(null);
      setPermissions({});
    }
  }, [user?.id, load]);

  const nivel = (moduloCodigo: string): number => {
    if (profile?.perfil === 'MASTER') return 4;
    return permissions[moduloCodigo] ?? 0;
  };

  const can = (moduloCodigo: string, nivelMinimo = 1): boolean => {
    return nivel(moduloCodigo) >= nivelMinimo;
  };

  return (
    <PermissionContext.Provider value={{
      profile,
      permissions,
      isLoading,
      nivel,
      can,
      reload: () => load(user!.id),
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
