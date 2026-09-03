import { z } from 'zod';

import { endpoints } from '@/src/config/env';
import type { SupportedLang } from './locale';

const API_BASE_URL = endpoints.travelCashApi;

// O backend gera o confirmationId real - mandamos um placeholder fixo
// (mesmo padrao do CreateAccount). O id retornado nao eh persistido pelo
// app: o estado "lido" eh refletido na proxima chamada de GetAlerts via
// flag `readed`.
const PLACEHOLDER_CONFIRMATION_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

// Schema do payload de /api/Content/GetAlerts. Mesmo formato base dos
// outros endpoints de conteudo (FAQ, Policies), mas com varios campos
// marcados como opcionais para tolerar variacoes do backend - se um
// alerta vier sem richText ou sem publishDate, nao queremos derrubar
// a tela inteira.
export type AlertItem = {
  contentId: string;
  title: string;
  description: string;
  richText?: string;
  isActive: boolean;
  publishDate?: string;
  contentType?: number;
  requiresReadConfirmation?: boolean;
  language: string;
  readed?: boolean;
};

export const AlertItemSchema: z.ZodType<AlertItem> = z.object({
  contentId: z.string(),
  title: z.string(),
  description: z.string(),
  richText: z.string().optional(),
  isActive: z.boolean(),
  publishDate: z.string().optional(),
  contentType: z.number().optional(),
  requiresReadConfirmation: z.boolean().optional(),
  language: z.string(),
  readed: z.boolean().optional(),
});

export async function getAlerts(
  accountId: string,
  lang: SupportedLang,
): Promise<AlertItem[]> {
  const url =
    `${API_BASE_URL}/api/Content/GetAlerts` +
    `?accountId=${encodeURIComponent(accountId)}` +
    `&language=${encodeURIComponent(lang)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });

  if (!response.ok) {
    throw new Error(`GetAlerts failed (${response.status})`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) return [];

  // Mesma defesa do FAQ: itens com shape esquisito sao descartados sem
  // derrubar a tela. Filtramos client-side por isActive e language - a
  // API tem o habito de devolver itens fora do filtro pedido.
  const valid: AlertItem[] = [];
  for (const item of raw) {
    const parsed = AlertItemSchema.safeParse(item);
    if (!parsed.success) continue;
    if (!parsed.data.isActive) continue;
    if (parsed.data.language !== lang) continue;
    valid.push(parsed.data);
  }

  // Ordena por data de publicacao (mais recente primeiro). Itens sem
  // publishDate vao para o final.
  valid.sort((a, b) => {
    const ta = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const tb = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return tb - ta;
  });

  return valid;
}

// ----------------------------------------------------------------------------
// ConfirmRead: POST /api/Content/ConfirmRead
// Marca um alerta como lido na conta do usuario. Disparado quando ele
// expande o card; o app trata localmente a UI otimista e este endpoint
// persiste o estado para a proxima sessao.
// ----------------------------------------------------------------------------

export async function confirmRead(
  contentId: string,
  accountId: string,
): Promise<void> {
  const url = `${API_BASE_URL}/api/Content/ConfirmRead`;
  const body = {
    confirmationId: PLACEHOLDER_CONFIRMATION_ID,
    contentId,
    accountId,
    confirmationDate: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.warn('[alerts] ConfirmRead HTTP', response.status);
    throw new Error(`ConfirmRead failed (${response.status})`);
  }
}
