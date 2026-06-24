import { z } from 'zod';

import type { SupportedLang } from './locale';

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

// Subset do payload de currency que o app consome. A API costuma
// devolver mais campos (symbol, currentExchangeRate, etc.) - mantemos
// como opcionais para tolerar variacoes de shape sem derrubar o picker.
export type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  currentExchangeRate?: number;
};

const CurrencyOptionSchema: z.ZodType<CurrencyOption> = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  symbol: z.string().optional(),
  currentExchangeRate: z.number().optional(),
});

// GetCurrency: POST /api/Financial/GetCurrency
// Body OBRIGATORIAMENTE com code = '' para que a API devolva a lista
// completa (~173 moedas). Mandando um code valido o servidor filtra
// para um unico item, o que nao serve para o picker. O filtro fica
// client-side via search box.
export async function getCurrencies(_lang: SupportedLang): Promise<CurrencyOption[]> {
  const url = `${API_BASE_URL}/api/Financial/GetCurrency`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ code: '' }),
  });

  if (!response.ok) {
    console.warn('[financial] GetCurrency HTTP', response.status);
    throw new Error(`GetCurrency failed (${response.status})`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) return [];

  // Mesmo padrao do FAQ/Alerts: itens com shape esquisito sao
  // descartados em vez de derrubar o picker inteiro.
  const valid: CurrencyOption[] = [];
  for (const item of raw) {
    const parsed = CurrencyOptionSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  valid.sort((a, b) => a.code.localeCompare(b.code));
  return valid;
}
