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
// Bandas de distancia (ordem de proximidade dos cards): near -> mid -> far.
// A ordem de prioridade e por proximidade: o mais perto primeiro, depois ~400km,
// depois ~1000km. Places alem de FAR_MAX_KM sao descartados.
const NEAR_MAX_KM = 150; // banda "perto"
const MID_MAX_KM = 450; // banda "~400 km" (150-450)
const FAR_MAX_KM = 1100; // banda "~1000 km" (450-1100); probes chegam a ~1500, cortamos aqui
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
  const region = placeRegion(place);
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
    // Hook curado pelo Gemini (a cidade/estado ja vao no titulo). Sem hook
    // (fallback geometrico), fica vazio - o titulo + a tag ja se sustentam.
    description: descriptionOverride?.trim() ?? '',
    imageUrl, // foto real da cidade; '' => NextTrips mostra o generico
  };
}

// Tag de fallback por banda de distancia (usada so quando o Gemini nao curou a
// banda e nao ha categoria). O normal e a tag vir da CATEGORIA (abaixo).
const TIER_TAG_KEYS: Record<RankTier, string> = {
  near: 'home.tripTagNearby',
  mid: 'home.tripTagRegional',
  far: 'home.tripTagFar',
};

// Categoria escolhida pelo Gemini -> tag exibida no card ("Capital", "Litoral",
// "Turística", "Natureza"). Melhora a apresentacao em relacao a mera distancia.
const CATEGORY_TAG_KEYS: Record<RankCategory, string> = {
  capital: 'home.tripTagCapital',
  coastal: 'home.tripTagCoastal',
  touristic: 'home.tripTagTouristic',
  nature: 'home.tripTagNature',
};

const MAX_CANDIDATES_PER_TIER = 10; // teto por faixa enviado ao Gemini (equilibrio entre variedade da shortlist e latencia)

type TripCandidate = { place: Place; tagKey: string; description?: string };

// PHOTO-GATE: escolhe UM card de um tier ENTRE os candidatos que tem foto no
// Wikimedia (getCityPhoto != null). Isso filtra "cidades mortas do interior"
// (sem foto de destaque na Wikipedia = sinal forte de baixa relevancia) e
// atende a regra de so mostrar places com foto. Consulta ate PHOTO_LOOKUP_CAP
// fotos por banda (cacheadas + em paralelo). preferFirst=true mantem o primeiro
// candidato (quando ele tem foto); false sorteia entre os que tem (variedade).
// Retorna null se nenhum candidato da banda tiver foto. As bandas sao disjuntas
// (por distancia), entao nao ha risco de repetir um place entre elas.
async function pickTripWithPhoto(
  candidates: TripCandidate[],
  lang: SupportedLang,
): Promise<SignInNextTrip | null> {
  // PRESERVA a ordem do Gemini (melhor-primeiro = mais aderente a preferencia).
  // NAO embaralha: embaralhar atropelava o ranqueamento e podia trazer cidades
  // que nao casam com o perfil. Consulta as fotos das TOP candidatas em ordem.
  const pool = candidates.slice(0, PHOTO_LOOKUP_CAP);
  if (pool.length === 0) return null;

  const photos = await Promise.all(
    pool.map((c) => withTimeout(getCityPhoto(c.place), PHOTO_TIMEOUT_MS, null)),
  );
  const withPhoto = pool
    .map((c, i) => ({ c, photo: photos[i] }))
    .filter((x): x is { c: TripCandidate; photo: string } => !!x.photo);
  if (withPhoto.length === 0) return null;

  // Sorteio PONDERADO favorecendo o topo: mantem a variedade (nao repete sempre
  // a mesma) sem trair a preferencia/qualidade - o 1o tem peso n, o ultimo 1.
  const entry = withPhoto[weightedFrontIndex(withPhoto.length)];
  return placeToTrip(entry.c.place, entry.c.tagKey, lang, entry.photo, entry.c.description);
}

// Indice [0..n) sorteado com peso linear decrescente (peso n no 1o, 1 no ultimo).
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

    // Classifica cada place numa banda de distancia (ordem de proximidade dos
    // cards): near -> mid (~400km) -> far (~1000km). Alem de FAR_MAX_KM, descarta.
    const bandFor = (dist: number): RankTier | null =>
      dist <= NEAR_MAX_KM ? 'near' : dist <= MID_MAX_KM ? 'mid' : dist <= FAR_MAX_KM ? 'far' : null;

    // Pools geometricos por banda (ordenados por distancia) - fallback quando o
    // Gemini nao curar aquela banda. A relevancia nesse caminho vem do PHOTO-GATE.
    const geoPools: Record<RankTier, RankedPlace[]> = { near: [], mid: [], far: [] };
    for (const r of ranked) {
      const band = bandFor(r.dist);
      if (band) geoPools[band].push(r);
    }

    // --- Curadoria pelo Gemini (preferida) -------------------------------------
    // Candidatas reais por banda (com teto). Inclui a banda 'near': o card 1
    // agora tambem e CURADO (nao mais a cidade crua do device). Prioridade: o
    // Perfil de Viajante manda; sem perfil, foco em capitais/praias/turisticas/
    // natureza (interior so se turistico). Falha/timeout => pool geometrico.
    const candidates: RankCandidate[] = [];
    const perBandCount: Record<RankTier, number> = { near: 0, mid: 0, far: 0 };
    for (const r of ranked) {
      const band = bandFor(r.dist);
      if (!band) continue;
      if (perBandCount[band] >= MAX_CANDIDATES_PER_TIER) continue;
      perBandCount[band] += 1;
      candidates.push({
        placeId: placeId(r.place),
        name: placeName(r.place),
        region: placeRegion(r.place),
        country: placeCountry(r.place),
        distanceKm: r.dist,
        tier: band,
      });
    }

    const aiResults = await rankDestinations(
      candidates,
      { city: deviceCity, country: deviceCountryLabel },
      lang,
      opts?.preferenceHint,
    );
    const byId = new Map(ranked.map((r) => [placeId(r.place), r.place] as const));
    const aiByBand = new Map<RankTier, RankPick[]>();
    if (aiResults) {
      for (const res of aiResults) aiByBand.set(res.tier, res.picks);
    }

    // Candidatos {place, tag, hook} de uma banda: shortlist do Gemini (relevante)
    // ou, se faltar, o pool geometrico da banda (filtrado depois pelo photo-gate).
    const bandCandidates = (band: RankTier): TripCandidate[] => {
      const picks = aiByBand.get(band);
      if (picks?.length) {
        return picks
          .filter((p) => byId.has(p.placeId))
          .map((p) => ({
            place: byId.get(p.placeId)!,
            tagKey: CATEGORY_TAG_KEYS[p.category] ?? TIER_TAG_KEYS[band],
            description: p.description,
          }));
      }
      return geoPools[band].map((r) => ({ place: r.place, tagKey: TIER_TAG_KEYS[band] }));
    };

    // --- Montagem final com PHOTO-GATE -----------------------------------------
    // Um card por banda (near -> mid -> far), sorteado ENTRE os que tem foto no
    // Wikimedia. Banda sem nenhum place com foto nao renderiza (sem card generico).
    // As 3 bandas + a foto do destino dos sonhos rodam em PARALELO (bandas
    // disjuntas por distancia, sem risco de repetir place entre elas).
    const dream = opts?.dreamDestination?.trim();
    const [nearTrip, midTrip, farTrip, dreamPhoto] = await Promise.all([
      pickTripWithPhoto(bandCandidates('near'), lang),
      pickTripWithPhoto(bandCandidates('mid'), lang),
      pickTripWithPhoto(bandCandidates('far'), lang),
      dream
        ? withTimeout(getCityPhoto({ display_name: dream } as Place), PHOTO_TIMEOUT_MS, null)
        : Promise.resolve(null),
    ]);

    const trips: SignInNextTrip[] = [];
    if (nearTrip) trips.push(nearTrip);
    if (midTrip) trips.push(midTrip);
    if (farTrip) trips.push(farTrip);

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
        `| ${ranked.length} places, deviceCountry=${deviceCountry || '?'}, farthest=${Math.round(ranked[ranked.length - 1].dist)}km, curator=${aiByBand.size ? `gemini(${aiByBand.size})` : 'geometric'}${opts?.preferenceHint ? ` | prefs="${opts.preferenceHint}"` : ' | prefs=off'}${dream ? `, dream="${dream}"` : ''}`,
      );
    }

    return trips.length ? trips : getNextTrips(lang);
  } catch (err) {
    captureHandledError(err, { scope: 'getGeoNextTrips' });
    console.warn('[content] getGeoNextTrips failed, using backend nextTrips:', err);
    return getNextTrips(lang);
  }
}
