import { translate } from '@/src/i18n';

import {
  SignInBannerSchema,
  SignInNextTripSchema,
  type SignInBanner,
  type SignInNextTrip,
} from './auth';
import { getCityPhoto } from './cityPhoto';
import type { LocationCoords } from './location';
import type { SupportedLang } from './locale';
import {
  destinationPoint,
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
// distancia; cada card recebe uma foto real da cidade (Wikidata P18, vide
// src/services/cityPhoto.ts) ou, se nao houver, um generico bonito:
//   1. Perto      - sorteio entre as cidades proximas.
//   2. Medio      - uma cidade na faixa ~500-1000 km.
//   3. Internacional - a cidade mais proxima num pais diferente do device.
//
// Estrategia: a API limita o raio de busca a 300km, entao nao da para alcancar
// os tiers distantes com uma busca so. Fazemos um LEQUE de buscas: uma no proprio
// device (tier perto) + varias em pontos-sonda projetados a ~700km em 8 rumos ao
// redor (destinationPoint). Agregamos e deduplicamos todas as cidades, calculamos
// a distancia real de cada uma (haversine) e bucketizamos. Rumos que caem no mar
// voltam vazios - tudo bem. O pais do device e inferido da cidade mais proxima;
// "internacional" = cidade mais proxima cujo pais difere desse.
//
// Resiliente por design - o prototipo nunca deixa a home pior do que hoje:
//   - sem coords (permissao negada) -> cai no getNextTrips(lang) do backend.
//   - qualquer erro / nenhum tier montado -> idem, fallback no backend.
// Tiers que nao aparecerem (sem cidade estrangeira por perto, etc.) simplesmente
// nao renderizam - a home nao quebra.
// ----------------------------------------------------------------------------

const MAX_RADIUS_KM = 300; // teto imposto pela API da TripEdge
const PROBE_DISTANCE_KM = 700; // distancia dos pontos-sonda ao device
const PROBE_BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 rumos (N, NE, ...)
const NEARBY_MAX_KM = 100; // acima disso ja nao conta como "perto"
const MID_MIN_KM = 500;
const MID_MAX_KM = 1000;
const PHOTO_TIMEOUT_MS = 4000; // teto por busca de foto (2 chamadas Wikimedia; nao atrasar o sign-in)

type RankedPlace = { place: Place; dist: number };

// Resolve a promise ou, se estourar `ms`, resolve com `fallback` (nunca rejeita).
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

// Busca no device + no leque de sondas, em paralelo, e devolve as cidades unicas
// (dedup por place_id). Cada busca tolera a propria falha (rumo no mar, etc.).
async function collectPlaces(coords: LocationCoords): Promise<Place[]> {
  const centers: LocationCoords[] = [
    coords,
    ...PROBE_BEARINGS.map((b) => destinationPoint(coords, PROBE_DISTANCE_KM, b)),
  ];
  const lists = await Promise.all(
    centers.map((c) =>
      searchPlacesByCoordinate({
        lat: c.lat,
        lng: c.lng,
        radiusKm: MAX_RADIUS_KM,
        type: 'city',
      }).catch(() => [] as Place[]),
    ),
  );
  const unique = new Map<string, Place>();
  for (const list of lists) {
    for (const place of list) unique.set(placeId(place), place);
  }
  return [...unique.values()];
}

function placeToTrip(
  place: Place,
  tagKey: string,
  lang: SupportedLang,
  imageUrl: string,
): SignInNextTrip {
  const name = placeName(place);
  const description =
    [placeRegion(place), placeCountry(place)].filter(Boolean).join(', ') || name;
  return {
    id: placeId(place),
    title: name,
    tag: translate(lang, tagKey),
    description,
    imageUrl, // foto real da cidade (Wikidata P18); '' => NextTrips mostra o generico
  };
}

// Sorteia um item da lista (para variar o place mostrado a cada login/refresh).
function pickRandom<T>(list: T[]): T | null {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export async function getGeoNextTrips(
  coords: LocationCoords | null,
  lang: SupportedLang,
): Promise<SignInNextTrip[]> {
  if (!coords) return getNextTrips(lang);

  try {
    const places = await collectPlaces(coords);

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

    const chosen: { place: Place; tagKey: string }[] = [];
    const usedIds = new Set<string>();
    const add = (candidate: RankedPlace | null, tagKey: string) => {
      if (!candidate) return;
      const id = placeId(candidate.place);
      if (usedIds.has(id)) return;
      usedIds.add(id);
      chosen.push({ place: candidate.place, tagKey });
    };

    // O pais do device vem sempre da cidade REALMENTE mais proxima (nao do
    // sorteio), para o filtro de "internacional" ser confiavel.
    const deviceCountry = placeCountry(ranked[0].place).toLowerCase();
    const unused = (r: RankedPlace) => !usedIds.has(placeId(r.place));

    // 1. Perto: sorteia entre as cidades dentro do raio "perto"; se nenhuma,
    //    a mais proxima. Assim cada login mostra um place diferente.
    const nearbyPool = ranked.filter((r) => r.dist <= NEARBY_MAX_KM);
    add(pickRandom(nearbyPool.length ? nearbyPool : [ranked[0]]), 'home.tripTagNearby');

    // 2. Medio: sorteia na faixa 500-1000 km; senao, entre os que ja passaram
    //    do raio "perto".
    const midBand = ranked.filter(
      (r) => r.dist >= MID_MIN_KM && r.dist <= MID_MAX_KM && unused(r),
    );
    const midFallback = ranked.filter((r) => r.dist > NEARBY_MAX_KM && unused(r));
    add(pickRandom(midBand.length ? midBand : midFallback), 'home.tripTagRegional');

    // 3. Internacional: sorteia entre as cidades de um pais diferente do device.
    const intlPool = ranked.filter((r) => {
      const c = placeCountry(r.place).toLowerCase();
      return c && deviceCountry && c !== deviceCountry && unused(r);
    });
    add(pickRandom(intlPool), 'home.tripTagInternational');

    // Enriquece cada tier com a foto real da cidade (Wikidata P18), em paralelo e com
    // timeout curto para nao atrasar o sign-in. Miss/timeout => imageUrl '' =>
    // NextTrips renderiza o generico bonito. A URL persiste junto no nextTrips,
    // entao o boot por biometria ja vem com a foto (instantaneo).
    const trips = await Promise.all(
      chosen.map(async ({ place, tagKey }) => {
        const photo = await withTimeout(getCityPhoto(place), PHOTO_TIMEOUT_MS, null);
        return placeToTrip(place, tagKey, lang, photo ?? '');
      }),
    );

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
