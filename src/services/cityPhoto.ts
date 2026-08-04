import AsyncStorage from '@react-native-async-storage/async-storage';

import { placeId, placeLat, placeLng, placeName, type Place } from './places';

// ----------------------------------------------------------------------------
// Foto da cidade para os cards do NextTrips.
//
// A TripEdge nao manda foto. Bancos de imagem (Pexels/Unsplash/etc.) sao busca
// "best match" por keyword: SEMPRE devolvem alguma foto, mesmo sem relacao com a
// cidade - inutil para garantir relevancia.
//
// Fonte usada aqui: Wikidata (Wikimedia), amarrada a IDENTIDADE do lugar, nao a
// uma busca textual. Resolvemos a cidade pelas COORDENADAS do place (geosearch
// da Wikipedia -> artigo mais proximo -> QID do Wikidata) e lemos a propriedade
// P18 ("image"), que e a FOTOGRAFIA representativa curada da entidade. P18 e
// distinta do mapa de localizacao (P242) e do brasao (P94) - por isso nunca cai
// no mapa/brasao que a "lead image" da Wikipedia costumava trazer.
//
// Se a cidade nao tiver P18 (ou algo falhar), retornamos null e o componente
// mostra o generico bonito (ver pickGenericColor + NextTrips.tsx).
//
// Sem chave (Wikimedia e publico): nada de segredo no bundle. As chamadas ficam
// isoladas neste arquivo para ser trivial mover ao backend depois, se quisermos.
// ----------------------------------------------------------------------------

const WIKI_LANG = 'en'; // en.wikipedia tem a maior cobertura de geosearch/coords
const WIKIPEDIA_API = `https://${WIKI_LANG}.wikipedia.org/w/api.php`;
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const GEO_RADIUS_M = 10000; // 10 km ao redor do centro do place
const IMG_WIDTH = 1200; // largura do thumbnail servido pelo Commons
// A Wikimedia devolve 403 para User-Agent generico/vazio (o padrao do RN cai
// nisso) -> a policy dela exige um UA descritivo e identificavel. No RN da para
// sobrescrever o header 'User-Agent' (ao contrario do navegador); mandamos os
// dois (o 'Api-User-Agent' e lido quando o UA nao pode ser trocado).
// https://meta.wikimedia.org/wiki/User-Agent_policy
const WIKI_UA = 'TravelBackApp/1.0 (https://travelback.app; nextTrips city photo) react-native';
const WIKI_HEADERS = { 'User-Agent': WIKI_UA, 'Api-User-Agent': WIKI_UA };

// Cache local (AsyncStorage) para nao remartelar a Wikimedia a cada login.
// Guardamos a URL resolvida por placeId; "" = "buscamos e nao achou foto".
// IMPORTANTE: o sufixo de VERSAO invalida caches de fontes anteriores. A versao
// Pexels gravava misses ('') e URLs da Pexels sob 'cityphoto.<id>'; sem trocar a
// chave, getCityPhoto devolveria esse valor velho e nunca chamaria a Wikidata.
// Ao trocar de fonte/formato de novo, incremente o 'v2'.
const CACHE_PREFIX = 'cityphoto.v2.';
const HIT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MISS_TTL_MS = 2 * 24 * 60 * 60 * 1000; //  2 dias (tenta de novo mais cedo)

type CacheEntry = { url: string; ts: number };

async function readCache(key: string): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (typeof parsed?.url !== 'string' || typeof parsed?.ts !== 'number') return null;
    const ttl = parsed.url ? HIT_TTL_MS : MISS_TTL_MS;
    if (Date.now() - parsed.ts > ttl) return null; // expirou
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(key: string, url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ url, ts: Date.now() }));
  } catch {
    // cache e best-effort; ignorar falha de escrita
  }
}

// Normaliza texto para casar nomes: minusculo, sem acento, so [a-z0-9] e espacos.
// Ex.: "São Paulo" -> "sao paulo". (Hermes suporta String.prototype.normalize.)
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacriticos
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// geosearch da Wikipedia a partir das coordenadas do place: devolve o QID do
// Wikidata do artigo mais adequado (namespace 0). Entre os artigos proximos,
// preferimos aquele cujo titulo casa com o nome da cidade; senao, o mais proximo
// (geosearch devolve `index` por distancia). Assim evitamos pegar um POI vizinho.
async function nearestPlaceQid(place: Place): Promise<string | null> {
  const lat = placeLat(place);
  const lng = placeLng(place);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url =
    `${WIKIPEDIA_API}?action=query&format=json` +
    `&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=${GEO_RADIUS_M}` +
    `&ggslimit=8&ggsnamespace=0&prop=pageprops&ppprop=wikibase_item`;
  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('[cityPhoto] geosearch HTTP', res.status, body.slice(0, 200));
    return null;
  }
  const data = await res.json();
  const pages: Record<string, unknown> = data?.query?.pages ?? {};
  const list = Object.values(pages) as {
    title?: string;
    index?: number;
    pageprops?: { wikibase_item?: string };
  }[];
  if (list.length === 0) return null;

  const cityNorm = normalizeText(placeName(place));
  const titled = list.filter((p) => p.pageprops?.wikibase_item);
  if (titled.length === 0) return null;

  // casa titulo com o nome da cidade, tolerando variantes tipo
  // "New York" -> "New York City".
  const byName = cityNorm
    ? titled.find((p) => {
        const tn = normalizeText(p.title ?? '');
        return tn === cityNorm || tn.startsWith(`${cityNorm} `) || cityNorm.startsWith(`${tn} `);
      })
    : undefined;
  if (byName?.pageprops?.wikibase_item) return byName.pageprops.wikibase_item;

  // Sem casamento de nome: o mais proximo (menor index do geosearch).
  const nearest = titled.reduce((a, b) => ((a.index ?? 99) <= (b.index ?? 99) ? a : b));
  return nearest.pageprops?.wikibase_item ?? null;
}

// Le a propriedade P18 ("image") do item no Wikidata: devolve o nome do arquivo
// no Commons (ex.: "Paris - Eiffel Tower.jpg") ou null se a entidade nao tem P18.
async function imageFilenameForQid(qid: string): Promise<string | null> {
  const url =
    `${WIKIDATA_API}?action=wbgetclaims&format=json` +
    `&entity=${encodeURIComponent(qid)}&property=P18`;
  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('[cityPhoto] wbgetclaims HTTP', res.status, body.slice(0, 200));
    return null;
  }
  const data = await res.json();
  const claim = data?.claims?.P18?.[0];
  const filename = claim?.mainsnak?.datavalue?.value;
  return typeof filename === 'string' && filename ? filename : null;
}

// Monta a URL do arquivo no Commons. Special:FilePath redireciona para o binario
// real; `?width` serve um thumbnail ja redimensionado, usavel direto no <Image>.
function commonsFileUrl(filename: string): string {
  const name = filename.replace(/ /g, '_');
  return `${COMMONS_FILEPATH}/${encodeURIComponent(name)}?width=${IMG_WIDTH}`;
}

// Resolve a foto da cidade via Wikidata P18 (coordenadas -> QID -> P18 -> Commons).
// Retorna a URL ou null. Nunca lanca: qualquer falha, ou cidade sem P18, vira
// null e o card cai no generico.
export async function getCityPhoto(place: Place): Promise<string | null> {
  const id = placeId(place);
  const cached = await readCache(id);
  if (cached) return cached.url || null; // "" cacheado => sem foto

  try {
    let photoUrl = '';
    const qid = await nearestPlaceQid(place);
    if (qid) {
      const filename = await imageFilenameForQid(qid);
      if (filename) photoUrl = commonsFileUrl(filename);
    }
    await writeCache(id, photoUrl); // cacheia inclusive o miss ("")
    return photoUrl || null;
  } catch (err) {
    console.warn('[cityPhoto] lookup failed:', err);
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
