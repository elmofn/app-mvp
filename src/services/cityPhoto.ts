import AsyncStorage from '@react-native-async-storage/async-storage';

import { placeCountry, placeId, placeName, placeRegion, type Place } from './places';

// ----------------------------------------------------------------------------
// Foto da cidade para os cards do NextTrips.
//
// A TripEdge nao manda foto. Fonte usada aqui: BUSCA DE IMAGENS DO GOOGLE, via a
// Google Custom Search JSON API (searchType=image). Buscamos "<cidade> <pais>" e
// pegamos a PRIMEIRA imagem que o Google retorna - mesma ordem da busca de
// imagens do site. Relevancia bem melhor que banco de fotos (Pexels) ou Wikidata
// para o nosso caso.
//
// ⚠️ Scraping do google.com/search NAO e usado (viola o ToS, cai em CAPTCHA, HTML
// ofuscado, IP bloqueado). Esta e a via oficial/estavel.
//
// Requer duas credenciais (grátis, cota de 100 buscas/dia):
//   - GOOGLE_API_KEY: Google Cloud -> habilitar "Custom Search API" -> criar chave.
//   - GOOGLE_CSE_CX : https://programmablesearchengine.google.com -> novo mecanismo
//                     com "Search the entire web" + "Image search" ligado -> copiar o id (cx).
// Vazias => sem chamada de rede, todo card usa o generico (pickGenericColor).
//
// ⚠️ TEMPORARIO / PROTOTIPO: as credenciais abaixo vao no bundle do app (igual a
// chave sandbox da TripEdge em places.ts). Antes de producao, mover esta chamada
// para o backend (proxy) que guarda as credenciais server-side. Tudo isolado
// neste arquivo para essa migracao ser trivial.
// ----------------------------------------------------------------------------

const GOOGLE_CSE_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';
const GOOGLE_API_KEY = ''; // <- cole a API key aqui
const GOOGLE_CSE_CX = ''; //  <- cole o id do mecanismo (cx) aqui

// Cache local (AsyncStorage) para nao gastar cota/rede a cada login/refresh.
// Guardamos a URL resolvida por placeId; "" = "buscamos e nao achou foto".
// O sufixo de VERSAO invalida caches de fontes anteriores (Pexels 'v1', Wikidata
// 'v2'); ao trocar de fonte/formato de novo, incremente-o.
const CACHE_PREFIX = 'cityphoto.v3.';
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

// Busca a 1a imagem do Google (Custom Search) para "<cidade> <pais>". Retorna a
// URL ou null. Nunca lanca: sem credenciais, sem resultado, ou qualquer falha,
// vira null e o card cai no generico.
export async function getCityPhoto(place: Place): Promise<string | null> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_CX) return null;

  const id = placeId(place);
  const cached = await readCache(id);
  if (cached) return cached.url || null; // "" cacheado => sem foto

  const city = placeName(place);
  if (!city) return null;
  // "<cidade> <pais>" (regiao como reforco quando nao ha pais).
  const query = [city, placeCountry(place) || placeRegion(place)].filter(Boolean).join(' ');

  try {
    const url =
      `${GOOGLE_CSE_ENDPOINT}` +
      `?key=${encodeURIComponent(GOOGLE_API_KEY)}` +
      `&cx=${encodeURIComponent(GOOGLE_CSE_CX)}` +
      `&q=${encodeURIComponent(query)}` +
      `&searchType=image&num=1&safe=active&imgType=photo&imgSize=large`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[cityPhoto] Google CSE HTTP', res.status, body.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const item = Array.isArray(data?.items) ? data.items[0] : null;
    // `link` = imagem original; `image.thumbnailLink` = thumb servido pelo Google
    // (mais confiavel de carregar). Preferimos a original; se falhar no device, o
    // onError do <Image> ja cai no generico.
    const photoUrl: string =
      (typeof item?.link === 'string' && item.link) ||
      (typeof item?.image?.thumbnailLink === 'string' && item.image.thumbnailLink) ||
      '';
    await writeCache(id, photoUrl); // cacheia inclusive o miss ("")
    return photoUrl || null;
  } catch (err) {
    console.warn('[cityPhoto] Google CSE fetch failed:', err);
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
