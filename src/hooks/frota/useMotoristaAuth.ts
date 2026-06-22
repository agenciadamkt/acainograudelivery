import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Sessão do motorista da Frota — chaves próprias, independentes do módulo
// Delivery (que usa driver_id/driver_name/driver_store_id).
const STORAGE_KEYS = {
  id: 'frota_motorista_id',
  nome: 'frota_motorista_nome',
};

export interface MotoristaSession {
  id: string;
  nome: string;
}

export function getMotoristaSession(): MotoristaSession | null {
  const id = localStorage.getItem(STORAGE_KEYS.id);
  const nome = localStorage.getItem(STORAGE_KEYS.nome);
  if (!id || !nome) return null;
  return { id, nome };
}

export function clearMotoristaSession() {
  localStorage.removeItem(STORAGE_KEYS.id);
  localStorage.removeItem(STORAGE_KEYS.nome);
}

export function useMotoristaLogin() {
  const [isLoading, setIsLoading] = useState(false);

  const login = async (phone: string): Promise<MotoristaSession | null> => {
    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');

      const { data, error } = await supabase
        .from('fleet_drivers' as any)
        .select('id, name, phone, active')
        .eq('active', true);

      if (error) throw error;

      const driver = (data ?? []).find(
        (d: any) => (d.phone ?? '').replace(/\D/g, '') === cleanPhone && cleanPhone.length > 0
      ) as any;

      if (!driver) return null;

      localStorage.setItem(STORAGE_KEYS.id, driver.id);
      localStorage.setItem(STORAGE_KEYS.nome, driver.name);
      return { id: driver.id, nome: driver.name };
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading };
}
