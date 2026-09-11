import { useEffect, useState } from 'react';

import * as Network from 'expo-network';

// Detecta ausencia de internet no device via expo-network (getNetworkStateAsync
// + addNetworkStateListener). "Offline" = sem conexao de rede OU conectado mas
// sem alcance a internet (ex.: Wi-Fi de portal sem saida).
//
// So tratamos como offline quando o estado e EXPLICITAMENTE false. Enquanto
// indeterminado (undefined/null, comum no primeiro frame do boot), assumimos
// online para nao piscar a trava por engano antes da primeira leitura resolver.
function computeOffline(state: Network.NetworkState | null): boolean {
  if (!state) return false;
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

export function useOnlineStatus(): { isOffline: boolean; recheck: () => Promise<void> } {
  const [state, setState] = useState<Network.NetworkState | null>(null);

  useEffect(() => {
    let mounted = true;

    // Leitura inicial do estado da rede.
    Network.getNetworkStateAsync()
      .then((s) => {
        if (mounted) setState(s);
      })
      .catch(() => undefined);

    // Listener de mudancas: quando a internet volta, o estado atualiza e a
    // trava se dispensa sozinha; quando cai, ela aparece.
    const sub = Network.addNetworkStateListener((s) => setState(s));

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Re-checagem manual (botao "Tentar novamente"): forca uma leitura nova sem
  // depender do listener, util quando o usuario acabou de reconectar.
  const recheck = async () => {
    try {
      const s = await Network.getNetworkStateAsync();
      setState(s);
    } catch {
      // Silencioso: mantem o estado atual em caso de falha na leitura.
    }
  };

  return { isOffline: computeOffline(state), recheck };
}
