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

// Ainda nao conhecemos o shape exato da resposta (o ambiente de dev bloqueia o
// dominio da TripEdge, entao nao deu para inspecionar). Schema tolerante: aceita
// os aliases mais provaveis de nome/coordenada e deixa o resto passar. O passo 1
// loga o JSON cru (searchPlacesByCoordinate) para confirmarmos os campos reais e
// apertar este schema depois.
const PlaceSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    latitude: z.number().optional(),
    lat: z.number().optional(),
    longitude: z.number().optional(),
    lng: z.number().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    region: z.string().optional(),
    state: z.string().optional(),
  })
  .passthrough();

export type Place = z.infer<typeof PlaceSchema>;

// Normalizadores dos aliases - um so lugar para ajustar quando virmos os campos
// reais na resposta.
export function placeId(p: Place): string {
  if (p.id !== undefined && p.id !== null) return String(p.id);
  return `${placeLat(p)},${placeLng(p)}`;
}
export function placeName(p: Place): string {
  return p.name ?? p.title ?? '';
}
export function placeLat(p: Place): number | null {
  return p.latitude ?? p.lat ?? null;
}
export function placeLng(p: Place): number | null {
  return p.longitude ?? p.lng ?? null;
}
export function placeRegion(p: Place): string {
  return p.region ?? p.state ?? '';
}
export function placeCountry(p: Place): string {
  return p.country ?? p.country_code ?? '';
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
  // Passo 1: como nao vimos a resposta real, logamos o cru para descobrir os
  // nomes dos campos e ajustar o PlaceSchema/normalizadores.
  console.log('[places] raw response:', JSON.stringify(raw)?.slice(0, 1200));

  // A resposta pode ser um array direto ou vir embrulhada (ex.: { data: [...] }
  // ou { places: [...] }). Tentamos os formatos mais provaveis.
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.places)
        ? raw.places
        : Array.isArray(raw?.results)
          ? raw.results
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
