// Abstração sobre captura de foto — usa @capacitor/camera (oficial), que já
// tem fallback web automático (equivalente ao antigo <input type=file
// capture="environment">) quando fora de contexto nativo, sem precisar de
// branch manual nem tocar nas telas que consomem (EntregaComprovanteDialog.tsx).
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Texto usado pelo plugin nativo (iOS/Android) quando o usuário fecha o
// seletor sem tirar foto — é o único caso que deve falhar em silêncio (mesmo
// comportamento do <input type=file> cancelado). Qualquer outro erro (câmera
// indisponível, permissão negada, etc.) precisa aparecer pra quem chamou,
// senão o botão "parece" não fazer nada — foi exatamente isso que quebrou em
// campo antes desse ajuste.
function isUserCancelled(message: string): boolean {
  return /cancel/i.test(message);
}

export async function capturePhoto(): Promise<File | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 85,
    });

    if (!photo.webPath) return null;

    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    const extension = photo.format || 'jpeg';
    const fileName = `comprovante-${Date.now()}.${extension}`;
    return new File([blob], fileName, { type: blob.type || `image/${extension}` });
  } catch (err: any) {
    const message = err?.message || 'Erro desconhecido ao acessar a câmera';
    if (isUserCancelled(message)) return null;
    console.error('[capturePhoto] Erro ao capturar foto:', message);
    throw new Error(message);
  }
}
