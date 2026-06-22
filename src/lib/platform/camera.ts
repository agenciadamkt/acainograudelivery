// Abstração sobre captura de foto — hoje implementada via <input type=file
// capture="environment">, ponto único de troca pra @capacitor/camera quando
// o app for empacotado nativamente, sem precisar tocar nas telas.

export function capturePhoto(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}
