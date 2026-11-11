import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import * as Network from 'expo-network';

// Detecta ausencia de internet no device via expo-network. "Offline" = sem
// conexao de rede OU conectado mas sem alcance a internet (ex.: Wi-Fi de portal
// sem saida, ou sinal de dados que caiu mantendo a interface "conectada").
//
// So tratamos como offline quando o estado e EXPLICITAMENTE false. Enquanto
// indeterminado (undefined/null, comum no primeiro frame do boot ou numa
// transicao de rede), assumimos online para nao piscar a trava por engano.
function computeOffline(state: Network.NetworkState | null): boolean {
  if (!state) return false;
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

// Backstop de polling. O listener do expo-network (addNetworkStateListener)
// dispara de forma confiavel para trocas de INTERFACE (ex.: ligar modo aviao),
// mas costuma NAO disparar quando o device continua conectado ao Wi-Fi/dados e
// so perde o ALCANCE a internet - justamente o caso em que a trava precisava
// aparecer e so vinha depois de reabrir o app. O poll + a re-checagem ao
// voltar do background garantem que a trava apareca em segundos, ao vivo.
const POLL_INTERVAL_MS = 3000;

export function useOnlineStatus(): { isOffline: boolean; recheck: () => Promise<void> } {
  const [isOffline, setIsOffline] = useState(false);

  // Ref espelho para comparar sem recriar os callbacks a cada render e para so
  // chamar setState quando o valor realmente muda (evita re-render em todo poll).
  const isOfflineRef = useRef(false);
  isOfflineRef.current = isOffline;

  const apply = useCallback((state: Network.NetworkState | null) => {
    const next = computeOffline(state);
    if (next !== isOfflineRef.current) {
      isOfflineRef.current = next;
      setIsOffline(next);
    }
  }, []);

  const recheck = useCallback(async () => {
    try {
      apply(await Network.getNetworkStateAsync());
    } catch {
      // Silencioso: mantem o estado atual em caso de falha na leitura.
    }
  }, [apply]);

  useEffect(() => {
    // Leitura inicial.
    void recheck();

    // Listener nativo: pega na hora as trocas de interface (modo aviao etc.).
    const netSub = Network.addNetworkStateListener((state) => apply(state));

    // Backstop 1: re-checa ao voltar o app para o primeiro plano.
    const appSub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') void recheck();
    });

    // Backstop 2: poll periodico enquanto montado - cobre a perda de alcance a
    // internet que o listener nao reporta. getNetworkStateAsync le o estado do
    // SO (nao faz request de rede), entao e barato.
    const poll = setInterval(() => void recheck(), POLL_INTERVAL_MS);

    return () => {
      netSub.remove();
      appSub.remove();
      clearInterval(poll);
    };
  }, [apply, recheck]);

  return { isOffline, recheck };
}
