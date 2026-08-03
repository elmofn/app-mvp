import { z } from 'zod';

import type { LocationCoords } from './location';

// ----------------------------------------------------------------------------
// Cliente da TripEdge (busca de "places" por coordenada).
//
// ⚠️ ATENCAO: este e o UNICO ponto do app que fala com um terceiro (TripEdge) e
// o UNICO que carrega uma chave de parceiro embutida. Isso e um PROTOTIPO: a
// chave SANDBOX abaixo vai no bundle do app e pode ser extraida. Antes de
// producao, mover esta chamada para o backend (proxy), que guarda a chave
// server-side - exatamente como o fluxo de marketplace (createNavigationCode).
// Mantemos tudo isolado neste arquivo justamente para essa migracao ser trivial.
// ----------------------------------------------------------------------------

const TRIPEDGE_BASE_URL = 'https://prod-rv-search.tripedge.com';
// ⚠️ TEMPORARIO / SANDBOX - nao enviar para producao (vide comentario acima).
const TRIPEDGE_PARTNER_KEY = 'SANDBOX_8aac2f66-372f-459c-9e72-b4d3cd4afc0d';

// Shape real confirmado com uma resposta da TripEdge (envelope data.results):
//   { place_id, display_name, formatted_address, type,
//     coordinates: { lat, long } }
// Ainda tolerante (.passthrough + optional) para nao quebrar se algum item vier
// incompleto; mantemos alguns aliases flat como rede de seguranca.
const CoordinatesSchema = z
  .object({
    lat: z.number().optional(),
    long: z.number().optional(), // TripEdge usa "long" (nao "lng")
    lng: z.number().optional(),
    longitude: z.number().optional(),
  })
  .passthrough();

const PlaceSchema = z
  .object({
    place_id: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    display_name: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    formatted_address: z.string().optional(),
    type: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),
    // aliases flat (fallback, caso algum item nao venha aninhado)
    latitude: z.number().optional(),
    lat: z.number().optional(),
    longitude: z.number().optional(),
    lng: z.number().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    state: z.string().optional(),
  })
  .passthrough();

export type Place = z.infer<typeof PlaceSchema>;

// Normalizadores - um so lugar que conhece os nomes de campo da TripEdge.
export function placeId(p: Place): string {
  const id = p.place_id ?? p.id;
  if (id !== undefined && id !== null) return String(id);
  return `${placeLat(p)},${placeLng(p)}`;
}

// display_name pode trazer a regiao entre parenteses, ex.:
// "Cachoeirinha (Rio Grande do Sul)". Para o titulo do card usamos so a cidade
// (antes do parenteses); a regiao entra na descricao (placeRegion).
export function placeName(p: Place): string {
  const raw = p.display_name ?? p.name ?? p.title ?? '';
  const parenIdx = raw.indexOf(' (');
  return parenIdx > 0 ? raw.slice(0, parenIdx).trim() : raw.trim();
}
export function placeLat(p: Place): number | null {
  return p.coordinates?.lat ?? p.latitude ?? p.lat ?? null;
}
export function placeLng(p: Place): number | null {
  return (
    p.coordinates?.long ??
    p.coordinates?.lng ??
    p.coordinates?.longitude ??
    p.longitude ??
    p.lng ??
    null
  );
}
export function placeRegion(p: Place): string {
  const m = (p.display_name ?? '').match(/\(([^)]+)\)/);
  return m ? m[1].trim() : (p.region ?? p.state ?? '');
}
// formatted_address termina no pais, ex.: "Porto Alegre, Brazil".
export function placeCountry(p: Place): string {
  if (p.formatted_address) {
    const parts = p.formatted_address.split(',');
    return parts[parts.length - 1].trim();
  }
  return p.country ?? '';
}

type SearchParams = {
  lat: number;
  lng: number;
  radiusKm: number;
  type?: string;
};

// GET /places/search?latitude=&longitude=&radius_km=&type=city
export async function searchPlacesByCoordinate({
  lat,
  lng,
  radiusKm,
  type = 'city',
}: SearchParams): Promise<Place[]> {
  const url =
    `${TRIPEDGE_BASE_URL}/places/search` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&radius_km=${encodeURIComponent(radiusKm)}` +
    `&type=${encodeURIComponent(type)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: TRIPEDGE_PARTNER_KEY,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn('[places] search HTTP', response.status, body.slice(0, 300));
    throw new Error(`TripEdge search failed (${response.status})`);
  }

  const raw = await response.json();

  // Envelope real da TripEdge: { data: { results: [...] } }. Mantemos os outros
  // formatos como fallback defensivo.
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data?.results)
      ? raw.data.results
      : Array.isArray(raw?.results)
        ? raw.results
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.places)
            ? raw.places
            : [];

  const valid: Place[] = [];
  for (const item of list) {
    const parsed = PlaceSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  return valid;
}

// Haversine: distancia em km entre duas coordenadas {lat,lng}.
export function distanceKm(a: LocationCoords, b: LocationCoords): number {
  const R = 6371; // raio da Terra em km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Escolhe o place mais proximo de `origin` (caso a API nao venha ordenada por
// distancia). Ignora places sem coordenada. Retorna null se nenhum servir.
export function nearestPlace(origin: LocationCoords, places: Place[]): Place | null {
  let best: Place | null = null;
  let bestDist = Infinity;
  for (const p of places) {
    const lat = placeLat(p);
    const lng = placeLng(p);
    if (lat === null || lng === null) continue;
    const d = distanceKm(origin, { lat, lng });
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
