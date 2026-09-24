import { z } from 'zod';

import { endpoints } from '@/src/config/env';
import type { SupportedLang } from './locale';

const API_BASE_URL = endpoints.travelCashApi;

// Schema do payload de FAQ retornado por /api/Content/GetFAQ. A propriedade
// children eh recursiva (children pode ter children), portanto declaramos
// manualmente o tipo + z.lazy para o Zod nao se perder na recursao.
export type FAQItem = {
  contentId: string;
  title: string;
  description: string;
  richText: string;
  isActive: boolean;
  publishDate: string;
  contentType: number;
  requiresReadConfirmation: boolean;
  language: string;
  children: FAQItem[];
  readed: boolean;
};

export const FAQItemSchema: z.ZodType<FAQItem> = z.lazy(() =>
  z.object({
    contentId: z.string(),
    title: z.string(),
    description: z.string(),
    richText: z.string(),
    isActive: z.boolean(),
    publishDate: z.string(),
    contentType: z.number(),
    requiresReadConfirmation: z.boolean(),
    language: z.string(),
    children: z.array(FAQItemSchema),
    readed: z.boolean(),
  }),
);

export const FAQListSchema = z.array(FAQItemSchema);

// O GetFAQ espera o idioma em lowercase com hifen (pt-br / en-us / es-es),
// como o GetPolices - diferente do SupportedLang (pt-BR / en-US / es-ES).
// Mapeamos antes de montar a URL e caimos em en-us para qualquer valor fora
// dessas tres opcoes.
function toFAQLang(lang: SupportedLang): string {
  switch (lang) {
    case 'pt-BR':
      return 'pt-br';
    case 'es-ES':
      return 'es-es';
    case 'en-US':
      return 'en-us';
    default:
      return 'en-us';
  }
}

export async function getFAQ(lang: SupportedLang): Promise<FAQItem[]> {
  const query = toFAQLang(lang);
  const url = `${API_BASE_URL}/api/Content/GetFAQ?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });

  if (!response.ok) {
    throw new Error(`GetFAQ failed (${response.status})`);
  }

  const raw = await response.json();
  // Aceitamos itens parcialmente invalidos: filtramos com safeParse item-a-item
  // para nao perder a tela inteira por causa de um campo esquisito em um
  // unico FAQ. A API tem devolvido itens dos tres idiomas mesmo com o ?query
  // setado, entao filtramos client-side pelo campo language do proprio item -
  // comparando em lowercase para tolerar variacoes de caixa do backend.
  if (!Array.isArray(raw)) return [];
  const valid: FAQItem[] = [];
  for (const item of raw) {
    const parsed = FAQItemSchema.safeParse(item);
    if (!parsed.success) continue;
    if (!parsed.data.isActive) continue;
    if (parsed.data.language.toLowerCase() !== query) continue;
    valid.push(parsed.data);
  }
  return valid;
}
