import { endpoints } from '@/src/config/env';
import type { SupportedLang } from './locale';

const API_BASE_URL = endpoints.travelCashApi;

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

// Le um campo de um objeto sem se importar com a caixa (id/Id/ID/iD).
// O backend hoje devolve camelCase, mas se isso virar PascalCase em
// algum endpoint nao queremos perder a lista inteira por causa disso.
function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const target = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === target) {
      const v = obj[k];
      if (typeof v === 'string') return v;
    }
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const target = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === target) {
      const v = obj[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return undefined;
}

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

  const raw: unknown = await response.json();

  // Aceita tanto array bare quanto envelope comum ({ items }, { data },
  // { list }, { currencies }) - o backend ja flutuou entre esses shapes
  // em outros endpoints, melhor cobrir todos.
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const wrap = raw as Record<string, unknown>;
    const candidate = wrap.items ?? wrap.data ?? wrap.list ?? wrap.currencies ?? wrap.result;
    if (Array.isArray(candidate)) items = candidate;
  }

  const valid: CurrencyOption[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const id = pickString(obj, 'id');
    const code = pickString(obj, 'code');
    const name = pickString(obj, 'name');
    if (!id || !code || !name) continue;
    valid.push({
      id,
      code,
      name,
      symbol: pickString(obj, 'symbol'),
      currentExchangeRate: pickNumber(obj, 'currentExchangeRate'),
    });
  }

  if (valid.length === 0) {
    // Diagnostico: log o shape recebido para ficar claro se o problema
    // foi shape novo (chaves diferentes) ou resposta envelopada de um
    // jeito nao previsto. Aparece no console do dev caso o picker fique
    // vazio em producao.
    const sample = items.find((it) => it && typeof it === 'object') as
      | Record<string, unknown>
      | undefined;
    console.warn(
      '[financial] GetCurrency parsed 0 currencies.',
      'rawIsArray=', Array.isArray(raw),
      'rawKeys=', raw && typeof raw === 'object' ? Object.keys(raw as object) : null,
      'firstItemKeys=', sample ? Object.keys(sample) : null,
    );
  }

  valid.sort((a, b) => a.code.localeCompare(b.code));
  return valid;
}
