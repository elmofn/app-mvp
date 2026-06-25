import { z } from 'zod';

import type { SupportedLang } from './locale';

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

// O endpoint GetPolices aceita o idioma em lowercase com hifen (pt-br /
// en-us / es-es) - diferente do SupportedLang usado nos demais servicos
// (pt-BR / en-US / es-ES). Mapeamos antes de bater na URL e caimos em
// en-us para qualquer valor fora dessas tres opcoes.
function toPolicesLang(lang: string | undefined | null): string {
  switch ((lang ?? '').toLowerCase()) {
    case 'pt-br':
      return 'pt-br';
    case 'es-es':
      return 'es-es';
    case 'en-us':
      return 'en-us';
    default:
      return 'en-us';
  }
}

// Mesmo shape dos polices do SignIn / GetAccountByCode - mantemos campos
// extras como opcionais para tolerar variacoes do backend (ex: language
// duplicado, contentType, etc.) sem derrubar o parse.
export type PoliceItem = {
  contentId: string;
  title: string;
  richText: string;
};

const PoliceItemSchema = z.object({
  contentId: z.string(),
  title: z.string(),
  richText: z.string(),
});

export async function getPolices(lang: SupportedLang): Promise<PoliceItem[]> {
  const language = toPolicesLang(lang);
  const url =
    `${API_BASE_URL}/api/Content/GetPolices` +
    `?language=${encodeURIComponent(language)}` +
    `&includeInactive=false`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });

  if (!response.ok) {
    throw new Error(`GetPolices failed (${response.status})`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) return [];

  const valid: PoliceItem[] = [];
  for (const item of raw) {
    const parsed = PoliceItemSchema.safeParse(item);
    if (!parsed.success) continue;
    if (!parsed.data.contentId || !parsed.data.richText) continue;
    valid.push({
      contentId: parsed.data.contentId,
      title: parsed.data.title,
      richText: parsed.data.richText,
    });
  }
  return valid;
}
