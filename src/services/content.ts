import { endpoints } from '@/src/config/env';
import { translate } from '@/src/i18n';

import {
  SignInBannerSchema,
  SignInNextTripSchema,
  type SignInBanner,
  type SignInNextTrip,
} from './auth';
import { getCityPhoto } from './cityPhoto';
import {
  generateDestinations,
  type GenCategory,
  type GeneratedDestination,
} from './gemini';
import type { LocationCoords } from './location';
import type { SupportedLang } from './locale';
import {
  nearestPlace,
  placeCountry,
  placeId,
  placeName,
  placeRegion,
  searchPlacesByCoordinate,
  type Place,
} from './places';
import { captureHandledError } from './telemetry';

const API_BASE_URL = endpoints.travelCashApi;

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
// getGeoNextTrips: monta os "Proximos Destinos" da home a partir da
// geolocalizacao do device. METODO (repensado):
//   1. Descobre a cidade do device (1 busca TripEdge por coordenada) - so para
//      dar contexto ao Gemini.
//   2. O GEMINI GERA os melhores destinos reais por banda de distancia (near ->
//      mid ~400km -> far ~1000km), priorizando o Perfil de Viajante; sem perfil,
//      foco em capitais/praias/turisticas/natureza (interior so se turistico).
//   3. Para cada banda, RESOLVE os destinos gerados para um place_id real via
//      busca por coordenada da TripEdge (as coords vem do Gemini), aplica o
//      photo-gate (so places com foto no Wikimedia) e escolhe um (peso no topo).
//
// Por que assim: antes o pool vinha de uma varredura por coordenada, que trazia
// cidades mortas e PERDIA as gemas turisticas - o Gemini so reordenava um pool
// ruim. Agora a QUALIDADE vem do Gemini (que conhece os destinos) e a TripEdge
// so RESOLVE o place_id para o deep-link. Resiliente: sem coords / Gemini falha /
// nada resolve -> cai no getNextTrips(lang) do backend.
// ----------------------------------------------------------------------------

// Distancias das bandas a partir do device (informadas ao Gemini): near -> mid
// (~400km) -> far (~1000km). Ordem de prioridade por proximidade.
const BAND_KM = { near: 150, mid: 450, far: 1100 };
const PER_BAND = 4; // destinos que o Gemini gera por banda (melhor-primeiro)
const RESOLVE_CAP = 3; // candidatos resolvidos por banda (place_id + foto)
const RESOLVE_RADIUS_KM = 50; // raio p/ resolver a cidade gerada -> place_id na TripEdge
const DEVICE_CITY_RADIUS_KM = 100; // raio p/ descobrir a cidade do device (contexto)
const PHOTO_TIMEOUT_MS = 4000; // teto por busca de foto (nao atrasar a carga)

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

function placeToTrip(
  place: Place,
  tagKey: string,
  lang: SupportedLang,
  imageUrl: string,
  description: string,
  regionOverride?: string,
): SignInNextTrip {
  const name = placeName(place);
  // Regiao autoritativa da TripEdge; se faltar, usa a do Gemini (regionOverride).
  const region = placeRegion(place) || regionOverride || '';
  const country = placeCountry(place);
  // Titulo no formato "Cidade, Estado" (ex.: "Gramado, Rio Grande do Sul").
  // Sem estado/regiao, cai para "Cidade, Pais"; sem nenhum, so a cidade.
  const title = region ? `${name}, ${region}` : country ? `${name}, ${country}` : name;
  const id = placeId(place);
  return {
    id,
    placeId: id, // usado pelo deep-link do card (busca TripEdge por place_id)
    title,
    tag: translate(lang, tagKey),
    description: description.trim(), // hook do Gemini (cidade/estado ja vao no titulo)
    imageUrl,
  };
}

// Categoria escolhida pelo Gemini -> tag do card ("Capital", "Litoral",
// "Turística", "Natureza").
const CATEGORY_TAG_KEYS: Record<GenCategory, string> = {
  capital: 'home.tripTagCapital',
  coastal: 'home.tripTagCoastal',
  touristic: 'home.tripTagTouristic',
  nature: 'home.tripTagNature',
};

// Indice [0..n) sorteado com peso linear decrescente (peso n no 1o, 1 no ultimo).
// Favorece o topo (melhor-primeiro do Gemini = mais aderente a preferencia) sem
// repetir sempre a mesma cidade.
function weightedFrontIndex(n: number): number {
  if (n <= 1) return 0;
  const total = (n * (n + 1)) / 2;
  let r = Math.random() * total;
  for (let i = 0; i < n; i += 1) {
    r -= n - i;
    if (r < 0) return i;
  }
  return 0;
}

// Escolhe o place da TripEdge que melhor corresponde ao destino gerado: match por
// NOME (igualdade/inclusao) e, na falta, o mais proximo das coords geradas.
function matchGeneratedPlace(gen: GeneratedDestination, places: Place[]): Place | null {
  if (places.length === 0) return null;
  const target = gen.name.trim().toLowerCase();
  const byName = places.find((p) => {
    const n = placeName(p).toLowerCase();
    return n === target || n.includes(target) || target.includes(n);
  });
  return byName ?? nearestPlace({ lat: gen.lat, lng: gen.lng }, places);
}

// Resolve UM destino gerado pelo Gemini para um card:
//   1. place_id real via TripEdge (busca por coordenada perto das coords geradas);
//   2. foto no Wikimedia (photo-gate);
//   3. monta o card ("Cidade, Estado" + hook + tag da categoria).
// null se a TripEdge nao tem a cidade ou se nao ha foto.
async function resolveDestination(
  gen: GeneratedDestination,
  lang: SupportedLang,
): Promise<SignInNextTrip | null> {
  const places = await searchPlacesByCoordinate({
    lat: gen.lat,
    lng: gen.lng,
    radiusKm: RESOLVE_RADIUS_KM,
    type: 'city',
  }).catch(() => [] as Place[]);
  const place = matchGeneratedPlace(gen, places);
  if (!place) return null; // TripEdge nao cobre a cidade -> descarta

  const photo = await withTimeout(getCityPhoto(place), PHOTO_TIMEOUT_MS, null);
  if (!photo) return null; // photo-gate: so places com foto no Wikimedia

  const tagKey = CATEGORY_TAG_KEYS[gen.category] ?? CATEGORY_TAG_KEYS.touristic;
  return placeToTrip(place, tagKey, lang, photo, gen.description, gen.region);
}

// Um card por banda: resolve os TOP RESOLVE_CAP destinos gerados em paralelo e
// sorteia (peso no topo) ENTRE os que resolveram place_id + tem foto.
async function pickBandCard(
  gens: GeneratedDestination[],
  lang: SupportedLang,
): Promise<SignInNextTrip | null> {
  const pool = gens.slice(0, RESOLVE_CAP);
  if (pool.length === 0) return null;
  const cards = await Promise.all(pool.map((g) => resolveDestination(g, lang)));
  const valid = cards.filter((c): c is SignInNextTrip => c !== null);
  if (valid.length === 0) return null;
  return valid[weightedFrontIndex(valid.length)];
}

export async function getGeoNextTrips(
  coords: LocationCoords | null,
  lang: SupportedLang,
  // Contexto do Perfil de Viajante (so chega para usuarios da allowlist com
  // perfil salvo): preferenceHint enviesa a geracao do Gemini. O destino dos
  // sonhos NAO entra mais nas next trips (fica so no perfil).
  opts?: { preferenceHint?: string },
): Promise<SignInNextTrip[]> {
  if (!coords) return getNextTrips(lang);

  try {
    // 1. Cidade do device (contexto p/ o Gemini) - 1 busca barata; tolera falha.
    let deviceCity = '';
    let deviceCountry = '';
    try {
      const nearPlaces = await searchPlacesByCoordinate({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm: DEVICE_CITY_RADIUS_KM,
        type: 'city',
      });
      const dc = nearestPlace(coords, nearPlaces);
      if (dc) {
        deviceCity = placeName(dc);
        deviceCountry = placeCountry(dc);
      }
    } catch {
      // sem cidade do device -> o Gemini infere pelas coords
    }

    // 2. Gemini GERA os destinos por banda (prefs no topo da prioridade).
    const gen = await generateDestinations(
      { city: deviceCity, country: deviceCountry, lat: coords.lat, lng: coords.lng },
      lang,
      BAND_KM,
      PER_BAND,
      opts?.preferenceHint,
    );
    if (!gen || gen.length === 0) return getNextTrips(lang);

    // Agrupa por banda preservando a ordem (best-first do Gemini).
    const byBand: Record<GeneratedDestination['band'], GeneratedDestination[]> = {
      near: [],
      mid: [],
      far: [],
    };
    for (const g of gen) byBand[g.band].push(g);

    // 3. Resolve 1 card por banda (place_id + foto), em PARALELO.
    const [nearCard, midCard, farCard] = await Promise.all([
      pickBandCard(byBand.near, lang),
      pickBandCard(byBand.mid, lang),
      pickBandCard(byBand.far, lang),
    ]);

    // Monta na ordem near -> mid -> far, deduplicando por place_id (raro, mas o
    // Gemini pode repetir uma cidade entre bandas).
    const trips: SignInNextTrip[] = [];
    const used = new Set<string>();
    for (const card of [nearCard, midCard, farCard]) {
      if (card && !used.has(card.id)) {
        used.add(card.id);
        trips.push(card);
      }
    }

    if (__DEV__) {
      console.log(
        '[content] geo trips:',
        trips.map((t) => `${t.tag}=${t.title}`).join(' | '),
        `| device=${deviceCity || '?'}, gerados=${gen.length} (near ${byBand.near.length}/mid ${byBand.mid.length}/far ${byBand.far.length})${opts?.preferenceHint ? ` | prefs="${opts.preferenceHint}"` : ' | prefs=off'}`,
      );
    }

    return trips.length ? trips : getNextTrips(lang);
  } catch (err) {
    captureHandledError(err, { scope: 'getGeoNextTrips' });
    console.warn('[content] getGeoNextTrips failed, using backend nextTrips:', err);
    return getNextTrips(lang);
  }
}
