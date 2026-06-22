// Cache local do status "Online" do motorista — só um atalho pra restaurar a
// UI instantaneamente ao reabrir o app, sem esperar a resposta da rede. O
// banco (fleet_drivers.status) continua sendo a fonte de verdade: toda leitura
// daqui é corrigida pela confirmação do banco assim que ela chegar.
const KEY = 'frota_driver_online_v1';

interface CachedState {
  motoristaId: string;
  online: boolean;
  timestamp: number;
}

export function saveDriverOnlineCache(motoristaId: string, online: boolean) {
  try {
    const payload: CachedState = { motoristaId, online, timestamp: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // localStorage indisponível (modo privado, quota cheia) — segue sem cache
  }
}

export function readDriverOnlineCache(motoristaId: string): boolean | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedState;
    if (parsed.motoristaId !== motoristaId) return null;
    return parsed.online;
  } catch {
    return null;
  }
}
