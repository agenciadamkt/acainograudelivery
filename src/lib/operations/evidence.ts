/**
 * Captura de evidências (Operações 2.0 — M2): upload de foto para o bucket
 * `operations_evidence` e captura de GPS (reusa a abstração de plataforma).
 * Inclui compressão automática de imagem antes do upload.
 */

import { supabase } from '@/integrations/supabase/client';
import { getLastKnownOrCurrentPosition, type GeoPosition } from '@/lib/platform/geolocation';

const BUCKET = 'operations_evidence';
const MAX_DIM = 1200;   // largura ou altura máxima após redimensionamento
const QUALITY  = 0.80;  // qualidade JPEG

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
 * Comprime uma imagem para no máximo MAX_DIM × MAX_DIM px, QUALITY JPEG.
 * Retorna um novo File com o mesmo nome e tipo image/jpeg.
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_DIM && height <= MAX_DIM) {
        // Já está dentro do limite, sem necessidade de redimensionar
        resolve(file);
        return;
      }
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Faz upload de uma foto de evidência (com compressão automática) e retorna a URL pública.
 * @throws Error em caso de falha no upload.
 */
export async function uploadEvidencePhoto(file: File, executionId: string): Promise<string> {
  const compressed = await compressImage(file);
  const ext = compressed.name.split('.').pop() || 'jpg';
  const path = `${executionId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: compressed.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Faz upload de múltiplas fotos de evidência em sequência.
 * Retorna array de URLs públicas.
 */
export async function uploadMultiplePhotos(
  files: File[],
  executionId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadEvidencePhoto(files[i], executionId);
    urls.push(url);
    onProgress?.(i + 1, files.length);
  }
  return urls;
}
