// Envio via Firebase Cloud Messaging (API HTTP v1) — usado tanto pelo push
// automático de status de pedido (send-customer-push) quanto pelas
// campanhas manuais de push do Marketing (scheduled-campaigns-check).

export interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Troca o JSON da conta de serviço por um access token OAuth2, assinando um
// JWT (RS256) com a chave privada via Web Crypto — evita depender de uma lib
// externa de JWT só pra isso.
export async function getFcmAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const pemBody = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResp.ok) {
    throw new Error(`Falha ao obter access token do FCM: ${await tokenResp.text()}`);
  }

  const tokenJson = await tokenResp.json();
  return tokenJson.access_token as string;
}

// Retorna { ok, unregistered } — unregistered=true quando o token não existe
// mais (app desinstalado/token rotacionado), pra o chamador decidir remover
// do banco.
export async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  notification: { title: string; body: string },
  data: Record<string, string> = {},
): Promise<{ ok: boolean; unregistered: boolean; error?: string }> {
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: { token: deviceToken, notification, data },
    }),
  });

  if (resp.ok) return { ok: true, unregistered: false };

  const errorBody = await resp.json().catch(() => ({}));
  const errorStatus = errorBody?.error?.status;
  const unregistered = errorStatus === 'UNREGISTERED' || errorStatus === 'NOT_FOUND';
  return { ok: false, unregistered, error: JSON.stringify(errorBody) };
}
