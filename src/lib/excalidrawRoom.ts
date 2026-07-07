// Gera um link de sala de colaboração do próprio excalidraw.com, no esquema
// aberto deles (#room=<id>,<chave base64url>). Não cria nenhum backend de
// sincronização — o excalidraw.com já faz a colaboração em tempo real e a
// criptografia ponta-a-ponta sozinho, usando os bytes que estiverem na URL.
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function gerarSalaExcalidraw(): { roomId: string; roomUrl: string } {
  const roomId = crypto.randomUUID().replace(/-/g, '');
  const roomKey = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  return { roomId, roomUrl: `https://excalidraw.com/#room=${roomId},${roomKey}` };
}
