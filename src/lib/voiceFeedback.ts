// Aviso falado (Web Speech API) — usado no admin (aba Rotas do Frota) pra
// anunciar em voz alta que uma entrega foi concluída. Não depende de nenhum
// arquivo de áudio nem serviço externo; cai em silêncio se o navegador não
// suportar ou bloquear (nunca trava o fluxo).

// getVoices() costuma vir vazia na primeira chamada (carregamento assíncrono
// do navegador) — cacheia e reconsulta quando o evento 'voiceschanged' avisar
// que a lista final está disponível.
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (!('speechSynthesis' in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

const FEMALE_NAME_HINTS = ['luciana', 'joana', 'camila', 'vitória', 'vitoria', 'maria', 'francisca', 'female', 'mulher'];

// Voz escolhida manualmente (ex: pelo seletor de teste) — guardada por
// voiceURI, que é o identificador estável de cada voz instalada no
// navegador/SO. Algumas vozes (em especial "Google português do Brasil" no
// Chrome) soam muito robotizadas; navegadores/SOs diferentes costumam trazer
// outras opções (ex: vozes "Online (Natural)" no Edge/Windows), por isso dar
// a opção de escolher em vez de fixar uma só.
const VOICE_PREF_KEY = 'frota_tts_voice_uri_v1';

export function getSelectedVoiceURI(): string | null {
  try { return localStorage.getItem(VOICE_PREF_KEY); } catch { return null; }
}

export function setSelectedVoiceURI(voiceURI: string) {
  try { localStorage.setItem(VOICE_PREF_KEY, voiceURI); } catch {
    // localStorage indisponível — a escolha só vale pra sessão atual via cache em memória
  }
}

// Lista de vozes em português pra popular um seletor. Sem nenhuma voz pt-*
// instalada (raro), devolve todas as vozes disponíveis em vez de uma lista
// vazia.
export function getPortugueseVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices.length === 0) refreshVoices();
  const pt = cachedVoices.filter(v => v.lang?.toLowerCase().startsWith('pt'));
  return pt.length > 0 ? pt : cachedVoices;
}

// 1) Voz escolhida manualmente, se ainda existir na lista atual.
// 2) Senão, heurística automática: prefere pt-BR, e entre as pt-BR prefere
//    uma com nome reconhecidamente feminino.
function pickPortugueseVoice(): SpeechSynthesisVoice | undefined {
  if (cachedVoices.length === 0) refreshVoices();

  const selectedURI = getSelectedVoiceURI();
  if (selectedURI) {
    const chosen = cachedVoices.find(v => v.voiceURI === selectedURI);
    if (chosen) return chosen;
  }

  const ptBr = cachedVoices.filter(v => v.lang?.toLowerCase() === 'pt-br');
  const candidates = ptBr.length > 0 ? ptBr : cachedVoices.filter(v => v.lang?.toLowerCase().startsWith('pt'));
  if (candidates.length === 0) return undefined;
  const female = candidates.find(v => FEMALE_NAME_HINTS.some(hint => v.name.toLowerCase().includes(hint)));
  return female ?? candidates[0];
}

export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.pitch = 1;
    const voice = pickPortugueseVoice();
    if (voice) utterance.voice = voice;
    // Não cancela falas pendentes: se duas entregas forem concluídas em
    // sequência rápida (ex. via Realtime), a segunda entra na fila do
    // navegador em vez de cortar a primeira no meio da frase.
    window.speechSynthesis.speak(utterance);
  } catch {
    // TTS indisponível/bloqueado — segue sem som
  }
}

// Efeito sonoro tocado ANTES da fala, pra chamar atenção pro painel antes do
// aviso falado. Resolve quando o som termina (evento 'ended'), em caso de
// erro, ou depois de um tempo máximo de segurança — nunca trava a fala
// esperando o áudio indefinidamente (ex: autoplay bloqueado pelo navegador).
function playNotificationSound(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      const audio = new Audio('/sounds/som-2.mp3');
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      audio.play().catch(finish);
      setTimeout(finish, 5000);
    } catch {
      finish();
    }
  });
}

export async function speakDeliveryCompleted(customerName: string) {
  await playNotificationSound();
  speak(`Entrega do ${customerName} foi concluída.`);
}
