import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMotoristaSession } from '@/hooks/frota/useMotoristaAuth';
import { SplashVideo } from './SplashVideo';

// Gate de abertura do app do motorista: mostra a splash animada (vídeo+áudio)
// e, ao final, decide a rota — reaproveitando a MESMA verificação de sessão
// já usada em MotoristaDashboard.tsx (getMotoristaSession(), localStorage),
// sem criar um sistema de autenticação paralelo.
//
// A "inicialização" deste app é síncrona (leitura de localStorage), então na
// prática o vídeo é sempre o fator que decide o tempo de espera (Regra A do
// requisito). O flag initDone existe mesmo assim, pra não deixar a tela em
// branco/preta caso essa inicialização deixe de ser síncrona no futuro
// (Regra B) — a navegação só acontece quando as duas condições (vídeo
// terminou E inicialização concluída) forem verdadeiras.
//
// Usa `replace: true` pra splash não entrar no histórico de navegação (botão
// Voltar não pode retornar pra ela). Como esse gate só é montado uma vez no
// boot do app (rota "/", nunca revisitada depois do primeiro replace), ele
// não reaparece ao voltar do background — só numa abertura fria de verdade.
export function FrotaSplashGate() {
  const navigate = useNavigate();
  const [videoDone, setVideoDone] = useState(false);
  const initDoneRef = useRef(true);

  useEffect(() => {
    if (!videoDone || !initDoneRef.current) return;
    const session = getMotoristaSession();
    navigate(session ? '/frota/dashboard' : '/frota/login', { replace: true });
  }, [videoDone, navigate]);

  return <SplashVideo onFinish={() => setVideoDone(true)} />;
}
