/**
 * Captura de evidências (Operações 2.0 — M2): upload de foto para o bucket
 * `operations_evidence` e captura de GPS (reusa a abstração de plataforma).
 */

import { supabase } from '@/integrations/supabase/client';
import { getLastKnownOrCurrentPosition, type GeoPosition } from '@/lib/platform/geolocation';

const BUCKET = 'operations_evidence';

export interface GpsCapture {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Captura a posição atual; retorna null se indisponível/negada. */
export async function captureGps(): Promise<GpsCapture | null> {
  try {
    const pos: GeoPosition | null = await getLastKnownOrCurrentPosition();
    if (!pos) return null;
    return { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy };
  } catch {
    return null;
  }
}

/** Info curta do dispositivo, para auditoria da evidência. */
export function deviceInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return `${navigator.platform ?? ''} · ${(navigator.userAgent ?? '').slice(0, 120)}`.trim();
}

/**
 * Faz upload da foto de evidência e retorna a URL pública.
 * @throws Error em caso de falha no upload.
 */
export async function uploadEvidencePhoto(file: File, executionId: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${executionId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
