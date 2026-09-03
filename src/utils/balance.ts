import type { SignInAccountDetails } from '@/src/services/auth';

import { formatCurrency } from './format';

// Snapshot da moeda local do usuario, derivada do setups.currency
// retornado pelo SignIn / atualizado pelo GetCurrency apos uma troca
// em settings. Centralizado aqui para que toda exibicao de saldo
// (home, statement, transaction, highlights, etc.) leia o mesmo
// trio symbol/code/rate.
export type LocalCurrency = {
  code: string;
  symbol: string;
  rate: number;
};

const USD_FALLBACK: LocalCurrency = { code: 'USD', symbol: 'US$', rate: 1 };

export function getLocalCurrency(account: SignInAccountDetails | null): LocalCurrency {
  const c = account?.setups?.currency;
  if (!c) return USD_FALLBACK;
  return {
    code: c.code || 'USD',
    // Algumas moedas chegam sem symbol explicito - caimos no code para
    // nao mostrar um cabecalho vazio do tipo " 1.234,56".
    symbol: c.symbol || c.code || '$',
    rate: c.currentExchangeRate || 1,
  };
}

// Converte um valor em USD para a moeda local do usuario e formata.
export function formatLocal(usdValue: number, local: LocalCurrency): string {
  return formatCurrency(usdValue * local.rate);
}

// Pass-through para deixar explicito que o valor recebido ja esta em USD.
export function formatUsd(usdValue: number): string {
  return formatCurrency(usdValue);
}
