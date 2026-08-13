import { z } from 'zod';

// ----------------------------------------------------------------------------
// Busca de hoteis por place_id (a MESMA que a pagina /results do marketplace
// dispara): POST {base}/api/hotels/search
//   body { place_id, check_in, check_out, rooms, filters, nationality }
//   -> { results: [{ hotel: {...}, rates }], metadata: {...}, ... }
//
// ⚠️ AUTENTICACAO: este endpoint vive no host do SITE (travelback-dev), nao no
// prod-rv-search da partner key. Ele se autentica pelo COOKIE de sessao
// (webtrip_session), o mesmo que o Partner SSO planta (src/services/partnerSso.ts).
// O app so tera esse cookie se ja tiver passado pelo SSO no mesmo host (o fetch
// nativo do RN compartilha o cookie jar por host). Sem sessao valida, a chamada
// pode voltar 401/403 - tratamos como "sem resultado" (o chamador degrada a
// secao para vazio). ANTES DE PRODUCAO, mover para o backend (proxy que assina a
// sessao/parceria server-side), igual ao restante da integracao TripEdge.
// ----------------------------------------------------------------------------

const HOTELS_SEARCH_BASE_URL = 'https://travelback-dev.tripedge.com';

const CHECK_IN_OFFSET_DAYS = 30; // busca uma estadia ~1 mes a frente (so p/ ter tarifas)
const STAY_NIGHTS = 7; // 7 noites, igual ao exemplo do /results

// Shape parcial confirmado com uma resposta real (results[].hotel). Tolerante
// (.passthrough + optional) - so exigimos o minimo para montar o card.
const RateSchema = z
  .object({
    price_per_night_avg: z.number().optional(),
    price_currency: z.string().optional(),
  })
  .passthrough();

const AddressSchema = z
  .object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    region: z.string().optional(),
  })
  .passthrough();

const CoordinatesSchema = z
  .object({
    lat: z.number().optional(),
    long: z.number().optional(), // TripEdge usa "long" (nao "lng")
  })
  .passthrough();

const SearchHotelSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    stars: z.number().optional(),
    rating: z.number().optional(), // nota 0..100 (review score)
    review_count: z.number().optional(),
    images: z.array(z.string()).optional(),
    coordinates: CoordinatesSchema.optional(),
    address: AddressSchema.optional(),
    lowest_rate: RateSchema.nullable().optional(),
  })
  .passthrough();

export type SearchHotel = z.infer<typeof SearchHotelSchema>;

// Data YYYY-MM-DD a partir de hoje + n dias.
function ymdInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Cache por place_id: o device parado nao re-busca a mesma cidade.
const cache = new Map<string, SearchHotel[]>();
const inflight = new Map<string, Promise<SearchHotel[]>>();

async function fetchSearch(placeId: string): Promise<SearchHotel[]> {
  const checkIn = ymdInDays(CHECK_IN_OFFSET_DAYS);
  const checkOut = ymdInDays(CHECK_IN_OFFSET_DAYS + STAY_NIGHTS);

  // Body espelha o que a /results envia (campos nulos inclusos para reduzir o
  // risco de 400 por payload incompleto).
  const body = {
    place_id: placeId,
    check_in: checkIn,
    check_out: checkOut,
    rooms: [{ adults: 2, children: 0, children_ages: [] }],
    filters: {
      price_range: null,
      star_rating: null,
      property_types: null,
      amenities: [],
      room_type: null,
      sort_by: null,
    },
    nationality: null,
  };

  const response = await fetch(`${HOTELS_SEARCH_BASE_URL}/api/hotels/search`, {
    method: 'POST',
    // credentials:'include' -> no RN o fetch nativo ja anexa o cookie de sessao
    // do jar (se houver, plantado pelo Partner SSO neste mesmo host).
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.warn('[hotelsSearch] HTTP', response.status, text.slice(0, 300));
    // 401/403 aqui = sem cookie de sessao (vide comentario de autenticacao).
    throw new Error(`TripEdge hotels/search failed (${response.status})`);
  }

  const raw = await response.json();

  // Diagnostico temporario: entender por que results vem vazio no app (busca
  // assincrona? sem sessao?). Remover depois de resolver.
  console.log(
    '[hotelsSearch] envelope:',
    'completed=', raw?.search_completed,
    '| total_hotels=', raw?.metadata?.total_hotels,
    '| total_pages=', raw?.metadata?.total_pages,
    '| results=', Array.isArray(raw?.results) ? raw.results.length : 'n/a',
    '| session_id=', raw?.session_id ? 'sim' : 'nao',
  );

  // Envelope { results: [{ hotel, rates }] }; cada item aninha o hotel em .hotel.
  const list: unknown[] = Array.isArray(raw?.results)
    ? raw.results
    : Array.isArray(raw?.data?.results)
      ? raw.data.results
      : [];

  const unwrap = (item: unknown): unknown =>
    item && typeof item === 'object' && 'hotel' in item
      ? (item as { hotel: unknown }).hotel
      : item;

  const valid: SearchHotel[] = [];
  for (const item of list) {
    const parsed = SearchHotelSchema.safeParse(unwrap(item));
    if (parsed.success) valid.push(parsed.data);
  }

  console.log(`[hotelsSearch] place_id=${placeId} -> ${valid.length} hoteis`);
  return valid;
}

// Busca hoteis por place_id, com cache + dedupe de requisicoes em voo.
// Qualquer erro sobe para o chamador (que degrada a secao para vazio).
export async function searchHotelsByPlaceId(placeId: string): Promise<SearchHotel[]> {
  if (!placeId) return [];

  const cached = cache.get(placeId);
  if (cached) return cached;

  const pending = inflight.get(placeId);
  if (pending) return pending;

  const promise = fetchSearch(placeId)
    .then((items) => {
      inflight.delete(placeId);
      if (items.length > 0) cache.set(placeId, items); // nao gruda lista vazia
      return items;
    })
    .catch((err) => {
      inflight.delete(placeId);
      throw err;
    });

  inflight.set(placeId, promise);
  return promise;
}
