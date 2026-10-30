const encoder = new TextEncoder();

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error('WHATSAPP_CREDENTIAL_KEY_MISSING');
  const keyBytes = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptConnectionToken(token: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    encoder.encode(token),
  );
  return { ciphertext: encodeBase64(new Uint8Array(encrypted)), iv: encodeBase64(iv) };
}

export async function decryptConnectionToken(ciphertext: string, iv: string, secret: string) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(iv) },
    await encryptionKey(secret),
    decodeBase64(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
