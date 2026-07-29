/**
 * Sessão do colaborador (CheckGrau — app operador, Bloco B).
 * Login por WhatsApp+OTP → sessão Supabase real; guarda o colaborador, as lojas
 * autorizadas e a loja selecionada (persistidos em localStorage).
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CollabStore { id: string; name: string; city?: string | null }
export interface CollabInfo { id: string; name: string; cargo: string }

interface VerifyResult {
  collaborator: CollabInfo;
  stores: CollabStore[];
  needs_store_selection: boolean;
  has_pin: boolean;
}

interface Ctx {
  loading: boolean;
  collaborator: CollabInfo | null;
  stores: CollabStore[];
  selectedStore: CollabStore | null;
  requestOtp: (whatsapp: string) => Promise<void>;
  verifyOtp: (whatsapp: string, code: string) => Promise<VerifyResult>;
  pinLogin: (whatsapp: string, pin: string) => Promise<{ needs_store_selection: boolean }>;
  setPin: (pin: string) => Promise<void>;
  selectStore: (storeId: string) => void;
  logout: () => Promise<void>;
}

/** Extrai { error, code } do erro de uma edge function (não a mensagem genérica). */
async function fnError(error: any): Promise<{ message: string; code?: string }> {
  let message = error?.message || 'Falha na operação.';
  let code: string | undefined;
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const j = await ctx.json();
      if (j?.error) message = j.error;
      if (j?.code) code = j.code;
    }
  } catch { /* mantém */ }
  return { message, code };
}

const CollaboratorContext = createContext<Ctx | undefined>(undefined);

const LS = { collab: 'cg_collab', stores: 'cg_stores', store: 'cg_store' };
const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

/** Marca o "último acesso" do colaborador (login ou abertura do app). Fire-and-forget. */
const touchLastSeen = (id: string | undefined | null) => {
  if (!id) return;
  (supabase as any).from('checkgrau_collaborators')
    .update({ last_seen_at: new Date().toISOString() }).eq('id', id)
    .then(() => {}, () => { /* coluna pode não existir ainda — ignora */ });
};

export function CollaboratorProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [collaborator, setCollaborator] = useState<CollabInfo | null>(null);
  const [stores, setStores] = useState<CollabStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Reidrata a partir da sessão Supabase + localStorage
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const collab = read<CollabInfo>(LS.collab);
        setCollaborator(collab);
        setStores(read<CollabStore[]>(LS.stores) ?? []);
        setSelectedStoreId(localStorage.getItem(LS.store));
        touchLastSeen(collab?.id); // abriu o app com sessão persistente
      }
      setLoading(false);
    })();
  }, []);

  const requestOtp = async (whatsapp: string) => {
    const { error } = await supabase.functions.invoke('send-whatsapp-verification', {
      body: { phone: whatsapp, name: 'Colaborador' },
    });
    if (error) throw error;
  };

  /** Aplica a sessão retornada por uma função de login (OTP ou PIN). */
  const applySession = async (data: any) => {
    await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    localStorage.setItem(LS.collab, JSON.stringify(data.collaborator));
    localStorage.setItem(LS.stores, JSON.stringify(data.stores ?? []));
    setCollaborator(data.collaborator);
    setStores(data.stores ?? []);
    touchLastSeen(data.collaborator?.id);
    if ((data.stores ?? []).length === 1) {
      localStorage.setItem(LS.store, data.stores[0].id);
      setSelectedStoreId(data.stores[0].id);
    } else {
      localStorage.removeItem(LS.store);
      setSelectedStoreId(null);
    }
  };

  const verifyOtp = async (whatsapp: string, code: string): Promise<VerifyResult> => {
    const { data, error } = await supabase.functions.invoke('collaborator-otp-verify', { body: { whatsapp, code } });
    if (error) { const e = await fnError(error); throw new Error(e.message); }
    if (data?.error) throw new Error(data.error);
    await applySession(data);
    return { collaborator: data.collaborator, stores: data.stores ?? [], needs_store_selection: !!data.needs_store_selection, has_pin: !!data.has_pin };
  };

  const pinLogin = async (whatsapp: string, pin: string): Promise<{ needs_store_selection: boolean }> => {
    const { data, error } = await supabase.functions.invoke('collaborator-pin-login', { body: { whatsapp, pin } });
    if (error) { const e = await fnError(error); const err: any = new Error(e.message); err.code = e.code; throw err; }
    if (data?.error) throw new Error(data.error);
    await applySession(data);
    return { needs_store_selection: !!data.needs_store_selection };
  };

  const setPin = async (pin: string): Promise<void> => {
    // usa a sessão atual (Authorization enviado automaticamente pelo functions client)
    const { data, error } = await supabase.functions.invoke('collaborator-set-pin', { body: { pin } });
    if (error) { const e = await fnError(error); throw new Error(e.message); }
    if (data?.error) throw new Error(data.error);
  };

  const selectStore = (storeId: string) => {
    localStorage.setItem(LS.store, storeId);
    setSelectedStoreId(storeId);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    [LS.collab, LS.stores, LS.store].forEach((k) => localStorage.removeItem(k));
    setCollaborator(null); setStores([]); setSelectedStoreId(null);
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;

  return (
    <CollaboratorContext.Provider value={{ loading, collaborator, stores, selectedStore, requestOtp, verifyOtp, pinLogin, setPin, selectStore, logout }}>
      {children}
    </CollaboratorContext.Provider>
  );
}

export function useCollaborator() {
  const ctx = useContext(CollaboratorContext);
  if (!ctx) throw new Error('useCollaborator deve ser usado dentro de CollaboratorProvider');
  return ctx;
}
