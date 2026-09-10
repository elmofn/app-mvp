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
  rankDestinations,
  type RankCandidate,
  type RankCategory,
  type RankPick,
  type RankTier,
} from './gemini';
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
// getGeoNextTrips: monta o nextTrips a partir da geolocalizacao do device,
// buscando places na TripEdge (vide src/services/places.ts). Tres "tiers" por
// distancia; cada card recebe uma foto real da cidade (fonte a definir, vide
// src/services/cityPhoto.ts) ou, por enquanto, um generico bonito:
//   1. Perto      - sorteio entre as cidades proximas.
//   2. Medio      - uma cidade na faixa ~500-1000 km.
//   3. Internacional - a cidade mais proxima num pais diferente do device.
//
// Estrategia: a API limita o raio de busca a 500km, entao nao da para alcancar
// os tiers distantes com uma busca so. Fazemos um LEQUE de buscas: uma no proprio
// device (tier perto) + varias em pontos-sonda projetados a ~1000km em 8 rumos ao
// redor (destinationPoint). Com raio de 500km, device (0-500km) e sondas
// (500-1500km) se tocam: cobertura continua ate ~1500km, sem buraco. Agregamos
// e deduplicamos todas as cidades, calculamos
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

const MAX_RADIUS_KM = 500; // teto imposto pela API da TripEdge (ampliado de 300 -> 500)
const PROBE_DISTANCE_KM = 1000; // distancia dos pontos-sonda ao device (raio 500 -> cobertura continua ate ~1500km)
const PROBE_BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 rumos (N, NE, ...)
const NEARBY_MAX_KM = 100; // acima disso ja nao conta como "perto"
const MID_MIN_KM = 500;
const MID_MAX_KM = 1000;
const PHOTO_TIMEOUT_MS = 4000; // teto por busca de foto (fonte a definir; nao atrasar o sign-in)
const PHOTO_LOOKUP_CAP = 6; // fotos consultadas por tier no photo-gate (cacheadas + paralelas)

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
  descriptionOverride?: string,
): SignInNextTrip {
  const name = placeName(place);
  const description =
    descriptionOverride?.trim() ||
    [placeRegion(place), placeCountry(place)].filter(Boolean).join(', ') ||
    name;
  const id = placeId(place);
  return {
    id,
    placeId: id, // usado pelo deep-link do card (busca TripEdge por place_id)
    title: name,
    tag: translate(lang, tagKey),
    description, // descricao curada pelo Gemini, ou regiao/pais como fallback
    imageUrl, // foto real da cidade (Google imagens); '' => NextTrips mostra o generico
  };
}

// Faixas por distancia usadas tanto na selecao geometrica quanto para rotular as
// candidatas enviadas ao Gemini.
const TIER_TAG_KEYS: Record<RankTier, string> = {
  nearby: 'home.tripTagNearby',
  regional: 'home.tripTagRegional',
  international: 'home.tripTagInternational',
};

// Categoria escolhida pelo Gemini -> tag exibida no card ("Capital", "Litoral",
// "Turística"). Melhora a apresentacao em relacao a mera faixa de distancia.
const CATEGORY_TAG_KEYS: Record<RankCategory, string> = {
  capital: 'home.tripTagCapital',
  coastal: 'home.tripTagCoastal',
  touristic: 'home.tripTagTouristic',
};

const MAX_CANDIDATES_PER_TIER = 10; // teto por faixa enviado ao Gemini (equilibrio entre variedade da shortlist e latencia)

// Sorteia um item da lista (para variar o place mostrado a cada login/refresh).
function pickRandom<T>(list: T[]): T | null {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

type TripCandidate = { place: Place; tagKey: string; description?: string };

// PHOTO-GATE: escolhe UM card de um tier ENTRE os candidatos que tem foto no
// Wikimedia (getCityPhoto != null). Isso filtra "cidades mortas do interior"
// (sem foto de destaque na Wikipedia = sinal forte de baixa relevancia) e
// atende a regra de so mostrar places com foto. Consulta ate PHOTO_LOOKUP_CAP
// fotos por tier (cacheadas + em paralelo). preferFirst=true mantem o primeiro
// candidato (a cidade do device) quando ele tem foto; senao sorteia entre os
// que tem (variedade). Retorna null se nenhum candidato do tier tiver foto.
// Os tiers sao disjuntos (por distancia/pais), entao nao ha risco de repetir um
// place entre eles - por isso nao precisamos de dedup cross-tier aqui.
async function pickTripWithPhoto(
  candidates: TripCandidate[],
  lang: SupportedLang,
  preferFirst: boolean,
): Promise<SignInNextTrip | null> {
  let pool = candidates;
  if (!preferFirst) pool = [...pool].sort(() => Math.random() - 0.5);
  pool = pool.slice(0, PHOTO_LOOKUP_CAP);
  if (pool.length === 0) return null;

  const photos = await Promise.all(
    pool.map((c) => withTimeout(getCityPhoto(c.place), PHOTO_TIMEOUT_MS, null)),
  );
  const withPhoto = pool
    .map((c, i) => ({ c, photo: photos[i] }))
    .filter((x): x is { c: TripCandidate; photo: string } => !!x.photo);
  if (withPhoto.length === 0) return null;

  const entry = preferFirst ? withPhoto[0] : (pickRandom(withPhoto) ?? withPhoto[0]);
  return placeToTrip(entry.c.place, entry.c.tagKey, lang, entry.photo, entry.c.description);
}

export async function getGeoNextTrips(
  coords: LocationCoords | null,
  lang: SupportedLang,
  // Contexto do Perfil de Viajante (so chega para usuarios da allowlist com
  // perfil salvo): preferenceHint enviesa a curadoria do Gemini; dreamDestination
  // adiciona um card extra (inspiracional) do destino dos sonhos do usuario.
  opts?: { preferenceHint?: string; dreamDestination?: string },
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

    // O pais / cidade do device vem sempre da cidade REALMENTE mais proxima (nao
    // do sorteio), para o filtro de "internacional" e o contexto do Gemini serem
    // confiaveis.
    const deviceCountry = placeCountry(ranked[0].place).toLowerCase();
    const deviceCountryLabel = placeCountry(ranked[0].place);
    const deviceCity = placeName(ranked[0].place);

    // Pools geometricos por faixa - fallback quando o Gemini nao curar um tier.
    // A relevancia nesse caminho vem do PHOTO-GATE (cidade sem foto no Wikimedia
    // = provavel cidade morta do interior -> nao entra).
    const midBand = ranked.filter((r) => r.dist >= MID_MIN_KM && r.dist <= MID_MAX_KM);
    const midFallback = ranked.filter((r) => r.dist > NEARBY_MAX_KM);
    const intlPool = ranked.filter((r) => {
      const c = placeCountry(r.place).toLowerCase();
      return c && deviceCountry && c !== deviceCountry;
    });

    // --- Curadoria pelo Gemini (preferida) -------------------------------------
    // Monta candidatas reais (com placeId) rotuladas por faixa, com teto por
    // tier, e pede ao Gemini uma shortlist das mais turisticas/relevantes de cada
    // faixa (evita cidades sem apelo, salvo se as preferencias pedirem). Qualquer
    // falha/timeout retorna null e caimos no pool geometrico + photo-gate.
    const candidates: RankCandidate[] = [];
    const perTierCount: Record<RankTier, number> = { nearby: 0, regional: 0, international: 0 };
    for (const r of ranked) {
      const country = placeCountry(r.place).toLowerCase();
      const tier: RankTier =
        country && deviceCountry && country !== deviceCountry
          ? 'international'
          : r.dist <= NEARBY_MAX_KM
            ? 'nearby'
            : 'regional';
      // 'nearby' nao vai para o Gemini: o card 1 e sempre a cidade do device
      // (deterministico). Curadoria/variedade ficam para regional e intl.
      if (tier === 'nearby') continue;
      if (perTierCount[tier] >= MAX_CANDIDATES_PER_TIER) continue;
      perTierCount[tier] += 1;
      candidates.push({
        placeId: placeId(r.place),
        name: placeName(r.place),
        region: placeRegion(r.place),
        country: placeCountry(r.place),
        distanceKm: r.dist,
        tier,
      });
    }

    const aiResults = await rankDestinations(
      candidates,
      { city: deviceCity, country: deviceCountryLabel },
      lang,
      opts?.preferenceHint,
    );
    // Shortlist curada por tier (melhor primeiro). byId resolve placeId -> Place.
    const byId = new Map(ranked.map((r) => [placeId(r.place), r.place] as const));
    const aiByTier = new Map<RankTier, RankPick[]>();
    if (aiResults) {
      for (const res of aiResults) aiByTier.set(res.tier, res.picks);
    }

    // Lista de candidatos de um tier: shortlist do Gemini (relevante) ou, se
    // faltar, o pool geometrico ordenado por distancia (filtrado pelo photo-gate).
    const tierCandidates = (tier: 'regional' | 'international'): TripCandidate[] => {
      const picks = aiByTier.get(tier);
      if (picks?.length) {
        return picks
          .filter((p) => byId.has(p.placeId))
          .map((p) => ({
            place: byId.get(p.placeId)!,
            tagKey: CATEGORY_TAG_KEYS[p.category] ?? TIER_TAG_KEYS[tier],
            description: p.description,
          }));
      }
      const pool = tier === 'regional' ? (midBand.length ? midBand : midFallback) : intlPool;
      return pool.map((r) => ({ place: r.place, tagKey: TIER_TAG_KEYS[tier] }));
    };

    // --- Montagem final com PHOTO-GATE -----------------------------------------
    // Por tier, escolhemos um place ENTRE os que tem foto no Wikimedia. Tier sem
    // nenhum place com foto simplesmente nao renderiza (sem card generico). Os 3
    // tiers (+ foto do destino dos sonhos) rodam em PARALELO: sao disjuntos, entao
    // nao ha dedup entre eles, e o photo-gate nao vira gargalo no login.
    const deviceCityPlace = ranked[0].place;
    const nearbyCandidates: TripCandidate[] = [
      { place: deviceCityPlace, tagKey: TIER_TAG_KEYS.nearby },
      ...ranked
        .filter((r) => r.dist <= NEARBY_MAX_KM && placeId(r.place) !== placeId(deviceCityPlace))
        .map((r) => ({ place: r.place, tagKey: TIER_TAG_KEYS.nearby })),
    ];
    const dream = opts?.dreamDestination?.trim();

    const [nearbyTrip, regionalTrip, intlTrip, dreamPhoto] = await Promise.all([
      // nearby: prefere a cidade do device no topo (card 1 estavel).
      pickTripWithPhoto(nearbyCandidates, lang, true),
      pickTripWithPhoto(tierCandidates('regional'), lang, false),
      pickTripWithPhoto(tierCandidates('international'), lang, false),
      dream
        ? withTimeout(getCityPhoto({ display_name: dream } as Place), PHOTO_TIMEOUT_MS, null)
        : Promise.resolve(null),
    ]);

    const trips: SignInNextTrip[] = [];
    if (nearbyTrip) trips.push(nearbyTrip);
    if (regionalTrip) trips.push(regionalTrip);
    if (intlTrip) trips.push(intlTrip);

    // Card extra: destino dos sonhos (perfil). Sem place_id => inspiracional (nao
    // clicavel). Photo-gate tambem se aplica: so entra se houver foto no
    // Wikimedia (mesma regra dos demais cards).
    if (dream && dreamPhoto) {
      trips.push({
        id: `dream:${dream}`,
        title: dream,
        tag: translate(lang, 'home.tripTagDream'),
        description: translate(lang, 'home.tripDreamDesc'),
        imageUrl: dreamPhoto,
      });
    }

    // Log conciso para conferir no teste (e ver se a API rendeu os tiers longes).
    // So em dev: em release nao polui os breadcrumbs do Sentry.
    if (__DEV__) {
      console.log(
        '[content] geo trips:',
        trips.map((t) => `${t.tag}=${t.title}`).join(' | '),
        `| ${ranked.length} places, deviceCountry=${deviceCountry || '?'}, farthest=${Math.round(ranked[ranked.length - 1].dist)}km, curator=${aiByTier.size ? `gemini(${aiByTier.size})` : 'geometric'}${opts?.preferenceHint ? ', prefs=on' : ''}${dream ? ', dream=on' : ''}`,
      );
    }

    return trips.length ? trips : getNextTrips(lang);
  } catch (err) {
    captureHandledError(err, { scope: 'getGeoNextTrips' });
    console.warn('[content] getGeoNextTrips failed, using backend nextTrips:', err);
    return getNextTrips(lang);
  }
}
