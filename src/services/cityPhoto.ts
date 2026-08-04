import AsyncStorage from '@react-native-async-storage/async-storage';

import { placeCountry, placeId, placeName, placeRegion, type Place } from './places';

// ----------------------------------------------------------------------------
// Foto da cidade para os cards do NextTrips.
//
// A TripEdge nao manda foto, e a Wikipedia costuma vir sem imagem ou com um
// mapa/brasao. Entao buscamos uma FOTO REAL na Pexels (banco de fotografia,
// nunca devolve mapa) por "<cidade>, <pais>". Quando nao ha chave, ou a busca
// vem vazia/da erro, retornamos null e o componente mostra um generico bonito
// (ver pickGenericColor + NextTrips.tsx).
//
// ⚠️ ATENCAO: a chave abaixo vai no bundle do app (igual a sandbox da TripEdge
// em places.ts). Isso e PROTOTIPO: antes de producao, mover esta chamada para o
// backend (proxy) que guarda a chave server-side. Mantemos tudo isolado neste
// arquivo justamente para essa migracao ser trivial.
// ----------------------------------------------------------------------------

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';
// ⚠️ TEMPORARIO / SANDBOX - nao enviar para producao (vide comentario acima).
// Vazia => todo card usa o generico (sem nenhuma chamada de rede).
const PEXELS_API_KEY = 'djhXjTighRzEltWNZI347OaH6qS2MVN3qunuzPzZNM9l0gG4PzBL8lgA';

// Cache local (AsyncStorage) para nao remartelar a Pexels a cada login/refresh.
// Guardamos a URL resolvida por placeId; "" = "buscamos e nao achou foto".
const CACHE_PREFIX = 'cityphoto.';
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

// Busca 1 foto de paisagem da cidade na Pexels. Retorna a URL ou null.
// Nunca lanca - qualquer falha vira null (o card cai no generico).
export async function getCityPhoto(place: Place): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;

  const id = placeId(place);
  const cached = await readCache(id);
  if (cached) return cached.url || null; // "" cacheado => sem foto

  const city = placeName(place);
  if (!city) return null;
  // "<cidade>, <pais>" (ou regiao como reforco) melhora o casamento da busca.
  const query = [city, placeCountry(place) || placeRegion(place)].filter(Boolean).join(', ');

  try {
    const url =
      `${PEXELS_BASE_URL}/search` +
      `?query=${encodeURIComponent(query)}` +
      `&orientation=landscape&per_page=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: PEXELS_API_KEY },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[cityPhoto] Pexels HTTP', response.status, body.slice(0, 200));
      return null;
    }
    const raw = await response.json();
    const photo = Array.isArray(raw?.photos) ? raw.photos[0] : null;
    const photoUrl: string = photo?.src?.landscape ?? photo?.src?.large ?? '';
    await writeCache(id, photoUrl); // cacheia inclusive o miss ("")
    return photoUrl || null;
  } catch (err) {
    console.warn('[cityPhoto] Pexels fetch failed:', err);
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
