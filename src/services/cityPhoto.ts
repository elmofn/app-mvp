import { placeName, type Place } from './places';

// ----------------------------------------------------------------------------
// Foto da cidade para os cards do NextTrips.
//
// FONTE: Wikipedia (MediaWiki Action API "pageimages"), gratuita e sem chave:
//   GET https://en.wikipedia.org/w/api.php?action=query&prop=pageimages
//       &piprop=thumbnail&pithumbsize=<W>&redirects=1&titles=<Cidade>
//   -> query.pages[0].thumbnail.source (URL ja num tamanho VALIDO)
//
// Por que a Action API e nao a REST "summary": a Wikimedia restringe a geracao
// de thumbnails a uma lista fixa de tamanhos (erro "Use thumbnail sizes listed
// on ..." para tamanhos fora dela). Reescrever a largura na URL na mao quebra;
// o `pithumbsize` faz a API devolver uma URL ja num bucket valido. Alem disso,
// evita os parametros ?utm_* que a REST summary gruda no thumbnail. `redirects=1`
// resolve nomes (ex.: "Ciudad del este" -> "Ciudad del Este").
//
// Idioma: Wikipedia em ingles (cobertura mais ampla de nomes de cidade). Como o
// Gemini prioriza capitais / litoral / turisticas (src/services/gemini.ts), o hit
// rate e alto e consistente.
//
// Resiliente: NUNCA lanca. Sem foto / cidade ambigua / erro / timeout => null, e
// o card cai no generico bonito (pickGenericColor). O TripImage do NextTrips
// ainda tem onError, entao mesmo uma URL que falhe ao carregar degrada sozinha.
//
// ⚠️ Nota de escala: hoje o app fala direto com a Wikipedia (~1 req por cidade,
// cacheada no processo e persistida no nextTrips). Se um dia quiser tirar essa
// chamada do cliente, o ponto de injecao continua sendo esta funcao.
// ----------------------------------------------------------------------------

const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
const THUMB_WIDTH = 800; // largura alvo; a API ajusta para o bucket valido mais proximo

// Cache por titulo (nome da cidade) para nao re-buscar a mesma cidade no mesmo
// processo (ex.: pull-to-refresh que reescolhe places parecidos).
const photoCache = new Map<string, string | null>();

export async function getCityPhoto(place: Place): Promise<string | null> {
  const name = placeName(place).trim();
  if (!name) return null;

  const cached = photoCache.get(name);
  if (cached !== undefined) return cached;

  const url =
    `${WIKIPEDIA_API_URL}?action=query&format=json&formatversion=2` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=${THUMB_WIDTH}&redirects=1` +
    `&titles=${encodeURIComponent(name)}`;

  try {
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
    const page = data?.query?.pages?.[0];
    const thumb: unknown = page?.thumbnail?.source;

    if (typeof thumb !== 'string' || !thumb) {
      // Cidade sem imagem de destaque na Wikipedia -> card usa o generico.
      photoCache.set(name, null);
      return null;
    }

    // A API gruda ?utm_source=...&utm_campaign=api&... no thumbnail; removemos
    // para usar a URL canonica limpa do upload.wikimedia.org.
    const clean = thumb.split('?')[0];
    photoCache.set(name, clean);
    return clean;
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
