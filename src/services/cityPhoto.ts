import { placeName, type Place } from './places';

// ----------------------------------------------------------------------------
// Foto da cidade para os cards do NextTrips.
//
// FONTE: Wikipedia (REST v1 "page summary"), gratuita e sem chave:
//   GET https://en.wikipedia.org/api/rest_v1/page/summary/<Cidade>
//   -> { type, thumbnail: { source, width, height }, originalimage: {...}, ... }
// Buscamos pelo nome da cidade (placeName). Como o Gemini prioriza capitais /
// litoral / cidades turisticas (src/services/gemini.ts), o hit rate na Wikipedia
// e alto e consistente. Idioma: usamos a Wikipedia em ingles por ter a cobertura
// mais ampla de nomes de cidade.
//
// Resiliente: NUNCA lanca. Sem foto / cidade ambigua / erro / timeout => null,
// e o card cai no generico bonito (pickGenericColor). O TripImage do NextTrips
// ainda tem onError, entao mesmo uma URL que falhe ao carregar degrada sozinha.
//
// ⚠️ Nota de escala: hoje o app fala direto com a Wikipedia (~1 req por cidade,
// cacheada no processo e persistida no nextTrips). Se um dia quiser tirar essa
// chamada do cliente, o ponto de injecao continua sendo esta funcao.
// ----------------------------------------------------------------------------

const WIKIPEDIA_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const TARGET_THUMB_WIDTH = 640; // largura alvo do thumbnail para os cards

// Cache por titulo (nome da cidade) para nao re-buscar a mesma cidade no mesmo
// processo (ex.: pull-to-refresh que reescolhe places parecidos).
const photoCache = new Map<string, string | null>();

// URLs de thumbnail do Wikimedia trazem um segmento ".../<N>px-Nome.jpg". Para
// nao pegar o thumbnail padrao (~320px, borrado num card full-width) nem o
// original (que pode ter MBs), reescrevemos a largura para TARGET_THUMB_WIDTH,
// sem passar da largura do original (evita 404 por upscale alem do disponivel).
function sizedThumb(thumbSource: string, originalWidth: number | undefined): string {
  const target = Math.min(TARGET_THUMB_WIDTH, originalWidth ?? TARGET_THUMB_WIDTH);
  return thumbSource.replace(/\/\d+px-/, `/${target}px-`);
}

export async function getCityPhoto(place: Place): Promise<string | null> {
  const name = placeName(place).trim();
  if (!name) return null;

  const cached = photoCache.get(name);
  if (cached !== undefined) return cached;

  try {
    const url = `${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(name)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        // Wikimedia pede um User-Agent descritivo (politica de uso da API).
        'User-Agent': 'TravelBACKApp/1.0 (+https://travelback.com)',
      },
    });

    if (!response.ok) {
      photoCache.set(name, null);
      return null;
    }

    const data = await response.json();

    // Pagina de desambiguacao nao e uma cidade especifica -> nao serve.
    if (data?.type === 'disambiguation') {
      photoCache.set(name, null);
      return null;
    }

    const thumbSource: unknown = data?.thumbnail?.source;
    const originalWidth: unknown = data?.originalimage?.width;
    const result =
      typeof thumbSource === 'string' && thumbSource
        ? sizedThumb(thumbSource, typeof originalWidth === 'number' ? originalWidth : undefined)
        : null;

    photoCache.set(name, result);
    return result;
  } catch {
    // Rede/JSON/etc.: sem foto => o card usa o generico.
    photoCache.set(name, null);
    return null;
  }
}

// Fundo do generico: paleta curada (tons de viagem) escolhida de forma
// DETERMINISTICA pelo seed (placeId) - a mesma cidade sempre pega a mesma cor,
// mas cidades diferentes variam. Sem Math.random para ser estavel entre renders.
const GENERIC_COLORS = [
  '#2A9D8F', // teal
  '#264653', // deep blue
  '#E76F51', // terracotta
  '#457B9D', // steel blue
  '#6D597A', // plum
  '#3A5A40', // forest
  '#E9C46A', // sand
  '#7D7BFE', // periwinkle (roxo da marca)
];

export function pickGenericColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return GENERIC_COLORS[Math.abs(hash) % GENERIC_COLORS.length];
}
