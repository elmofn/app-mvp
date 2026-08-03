import { translate } from '@/src/i18n';

import {
  SignInBannerSchema,
  SignInNextTripSchema,
  type SignInBanner,
  type SignInNextTrip,
} from './auth';
import type { LocationCoords } from './location';
import type { SupportedLang } from './locale';
import {
  distanceKm,
  placeCountry,
  placeId,
  placeLat,
  placeLng,
  placeName,
  placeRegion,
  searchPlacesByCoordinate,
  type Place,
} from './places';

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

// ----------------------------------------------------------------------------
// GetBanners: GET /api/Content/GetBanners?language={lang}
// Banners promocionais (home + shop num unico array, separados por
// `category`). Antes vinham no payload de SignIn; agora sao buscados a
// parte para que o pull-to-refresh da home os atualize sem novo login.
// ----------------------------------------------------------------------------

export async function getBanners(lang: SupportedLang): Promise<SignInBanner[]> {
  const url = `${API_BASE_URL}/api/Content/GetBanners?language=${encodeURIComponent(lang)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });

  if (!response.ok) {
    throw new Error(`GetBanners failed (${response.status})`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) return [];

  // Itens com shape esquisito sao descartados sem derrubar a tela.
  const valid: SignInBanner[] = [];
  for (const item of raw) {
    const parsed = SignInBannerSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  return valid;
}

// ----------------------------------------------------------------------------
// GetNextTrips: GET /api/Content/GetNextTrips?language={lang}
// Sugestoes de viagem exibidas na home, localizadas pelo idioma da conta.
// Mesma motivacao do GetBanners: sai do payload de SignIn para suportar
// refresh.
// ----------------------------------------------------------------------------

export async function getNextTrips(lang: SupportedLang): Promise<SignInNextTrip[]> {
  const url = `${API_BASE_URL}/api/Content/GetNextTrips?language=${encodeURIComponent(lang)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });

  if (!response.ok) {
    throw new Error(`GetNextTrips failed (${response.status})`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) return [];

  const valid: SignInNextTrip[] = [];
  for (const item of raw) {
    const parsed = SignInNextTripSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  return valid;
}

// ----------------------------------------------------------------------------
// getGeoNextTrips: monta o nextTrips a partir da geolocalizacao do device,
// buscando places na TripEdge (vide src/services/places.ts). Tres "tiers" por
// distancia, so texto (sem foto):
//   1. Perto      - a cidade mais proxima.
//   2. Medio      - uma cidade na faixa ~500-1000 km.
//   3. Internacional - a cidade mais proxima num pais diferente do device.
//
// Estrategia: UMA busca de raio grande a partir do device e bucketizacao por
// distancia (haversine). O pais do device e inferido da cidade mais proxima
// (seu pais). "Internacional" = primeira cidade cujo pais difere desse.
//
// Resiliente por design - o prototipo nunca deixa a home pior do que hoje:
//   - sem coords (permissao negada) -> cai no getNextTrips(lang) do backend.
//   - qualquer erro / nenhum tier montado -> idem, fallback no backend.
// Tiers medio/internacional que nao aparecerem (ex.: a API limitar resultados a
// cidades proximas) simplesmente nao renderizam - a home nao quebra.
// ----------------------------------------------------------------------------

// Raio grande o bastante para (idealmente) alcancar outro pais. Ajustavel.
const GEO_SEARCH_RADIUS_KM = 2000;
const NEARBY_MAX_KM = 100; // acima disso ja nao conta como "perto"
const MID_MIN_KM = 500;
const MID_MAX_KM = 1000;
const MID_TARGET_KM = 750; // centro da faixa media (para escolher o melhor candidato)

type RankedPlace = { place: Place; dist: number };

function placeToTrip(place: Place, tagKey: string, lang: SupportedLang): SignInNextTrip {
  const name = placeName(place);
  const description =
    [placeRegion(place), placeCountry(place)].filter(Boolean).join(', ') || name;
  return {
    id: placeId(place),
    title: name,
    tag: translate(lang, tagKey),
    description,
    imageUrl: '', // sem foto neste passo; NextTrips mostra um placeholder
  };
}

// Candidato mais proximo de uma distancia-alvo (para o tier medio).
function closestToDistance(list: RankedPlace[], target: number): RankedPlace | null {
  let best: RankedPlace | null = null;
  let bestDelta = Infinity;
  for (const c of list) {
    const delta = Math.abs(c.dist - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = c;
    }
  }
  return best;
}

export async function getGeoNextTrips(
  coords: LocationCoords | null,
  lang: SupportedLang,
): Promise<SignInNextTrip[]> {
  if (!coords) return getNextTrips(lang);

  try {
    const places = await searchPlacesByCoordinate({
      lat: coords.lat,
      lng: coords.lng,
      radiusKm: GEO_SEARCH_RADIUS_KM,
      type: 'city',
    });

    // Anota cada place com a distancia real ao device; descarta sem coordenada;
    // ordena do mais perto ao mais longe.
    const ranked: RankedPlace[] = places
      .map((place): RankedPlace | null => {
        const lat = placeLat(place);
        const lng = placeLng(place);
        if (lat === null || lng === null) return null;
        return { place, dist: distanceKm(coords, { lat, lng }) };
      })
      .filter((r): r is RankedPlace => r !== null)
      .sort((a, b) => a.dist - b.dist);

    if (ranked.length === 0) return getNextTrips(lang);

    const trips: SignInNextTrip[] = [];
    const usedIds = new Set<string>();
    const add = (candidate: RankedPlace | null, tagKey: string) => {
      if (!candidate) return;
      const id = placeId(candidate.place);
      if (usedIds.has(id)) return;
      usedIds.add(id);
      trips.push(placeToTrip(candidate.place, tagKey, lang));
    };

    // 1. Perto: o mais proximo.
    const nearest = ranked[0];
    const deviceCountry = placeCountry(nearest.place).toLowerCase();
    add(nearest, 'home.tripTagNearby');

    // 2. Medio: preferir a faixa 500-1000 km; senao, o mais proximo de 750 km
    //    entre os que ja passaram do raio "perto".
    const midBand = ranked.filter((r) => r.dist >= MID_MIN_KM && r.dist <= MID_MAX_KM);
    const midFallback = ranked.filter((r) => r.dist > NEARBY_MAX_KM);
    const mid = closestToDistance(midBand.length ? midBand : midFallback, MID_TARGET_KM);
    add(mid, 'home.tripTagRegional');

    // 3. Internacional: a mais proxima num pais diferente do device.
    const intl =
      ranked.find((r) => {
        const c = placeCountry(r.place).toLowerCase();
        return c && deviceCountry && c !== deviceCountry;
      }) ?? null;
    add(intl, 'home.tripTagInternational');

    // Log conciso para conferir no teste (e ver se a API rendeu os tiers longes).
    console.log(
      '[content] geo trips:',
      trips.map((t) => `${t.tag}=${t.title}`).join(' | '),
      `| ${ranked.length} places, deviceCountry=${deviceCountry || '?'}, farthest=${Math.round(ranked[ranked.length - 1].dist)}km`,
    );

    return trips.length ? trips : getNextTrips(lang);
  } catch (err) {
    console.warn('[content] getGeoNextTrips failed, using backend nextTrips:', err);
    return getNextTrips(lang);
  }
}
