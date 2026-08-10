import { z } from 'zod';

import { TRIPEDGE_PARTNER_KEY } from './places';

// ----------------------------------------------------------------------------
// Catalog da TripEdge: inventario completo de hoteis, paginado.
// POST {base}/data/hotels  body { page }  ->  { data: CatalogHotel[], success, message }
// Itera-se as paginas ate `data` vir vazio. Nao ha filtro server-side por
// estrelas, entao filtramos 5 estrelas no cliente.
//
// A doc lista o host api.tripedge.com, mas a SANDBOX_ key (compartilhada com
// places.ts) autentica em prod-rv-search.tripedge.com - tentamos esse primeiro.
// Se o path /data/hotels nao existir aqui, trocar CATALOG_BASE_URL para
// 'https://api.tripedge.com' (e usar a key real do catalog).
//
// ⚠️ Mesmo racional do places.ts: chave embutida no bundle, mover para o backend
// (que baixaria/cachearia o catalog) antes de producao.
// ----------------------------------------------------------------------------

const CATALOG_BASE_URL = 'https://prod-rv-search.tripedge.com';

const TARGET_RECOMMENDED = 10; // quantos hoteis 5★ queremos no carrossel
const MAX_PAGES = 5; // teto de paginas para nao baixar o inventario inteiro

// Modelo do card usado pelo TravelShop. score/scoreLabel/pricePerNight/distance
// sao opcionais: o catalog nao os fornece (recomendados mostram so estrelas +
// reviews); os hoteis "proximos" hardcoded ainda preenchem tudo.
export type Hotel = {
  id: string;
  image: string;
  name: string;
  location: string;
  rating: number; // 1..5 estrelas
  reviewCount: number;
  score?: number; // 9.4
  scoreLabel?: string; // "Maravilhoso"
  pricePerNight?: string; // ja formatado "US$419"
  distance?: string; // somente para hoteis proximos
};

const CatalogAddressSchema = z
  .object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    region: z.string().optional(),
  })
  .passthrough();

const CatalogHotelSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    stars: z.number().optional(),
    review_count: z.number().optional(),
    address: CatalogAddressSchema.optional(),
    images: z.array(z.string()).optional(),
    type: z.string().optional(),
  })
  .passthrough();

type CatalogHotel = z.infer<typeof CatalogHotelSchema>;

// As URLs de imagem vem com o token {size} (ex.: .../t/{size}/content/...jpeg).
// Precisa trocar por um tamanho valido. ⚠️ VALOR A CONFIRMAR na doc da TripEdge -
// se as imagens vierem quebradas, ajustar aqui.
const IMAGE_SIZE = '640x480';

function resolveImage(url: string): string {
  return url.replace('{size}', IMAGE_SIZE);
}

function toHotel(h: CatalogHotel): Hotel | null {
  const rawImage = h.images?.[0];
  const name = h.name?.trim();
  if (!rawImage || !name) return null; // sem imagem/nome o card fica ruim - descarta

  const location =
    [h.address?.city, h.address?.region].filter(Boolean).join(', ') ||
    h.address?.country ||
    '';

  return {
    id: String(h.id ?? name),
    image: resolveImage(rawImage),
    name,
    location,
    rating: 5,
    reviewCount: h.review_count ?? 0,
  };
}

async function fetchCatalogPage(page: number): Promise<CatalogHotel[]> {
  const response = await fetch(`${CATALOG_BASE_URL}/data/hotels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: TRIPEDGE_PARTNER_KEY,
    },
    body: JSON.stringify({ page }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn('[catalog] hotels HTTP', response.status, body.slice(0, 300));
    throw new Error(`TripEdge catalog failed (${response.status})`);
  }

  const raw = await response.json();

  // O host prod-rv-search costuma aninhar como { data: { results: [...] } }
  // (vide places.ts), enquanto a doc do api.tripedge.com usa { data: [...] }.
  // Toleramos os formatos mais provaveis.
  const list: unknown[] = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.data?.results)
      ? raw.data.results
      : Array.isArray(raw?.data?.hotels)
        ? raw.data.hotels
        : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.hotels)
            ? raw.hotels
            : [];

  // Cada item vem aninhado como { hotel: {...} } (confirmado na resposta real);
  // toleramos tambem o objeto direto (formato da doc).
  const unwrap = (item: unknown): unknown =>
    item && typeof item === 'object' && 'hotel' in item
      ? (item as { hotel: unknown }).hotel
      : item;

  const valid: CatalogHotel[] = [];
  for (const item of list) {
    const parsed = CatalogHotelSchema.safeParse(unwrap(item));
    if (parsed.success) valid.push(parsed.data);
  }

  // Diagnostico temporario: confirma estrelas e URL final da imagem (remover
  // depois). Se stars vier undefined, o campo tem outro nome.
  if (page === 1) {
    const h0 = valid[0];
    console.log(
      '[catalog] parsed=', valid.length,
      '| stars0=', h0?.stars,
      '| img0=', h0?.images?.[0] ? resolveImage(h0.images[0]) : null,
    );
  }

  return valid;
}

let cache: Hotel[] | null = null;

// Hoteis 5★ para a secao "Recomendados". Baixa paginas do catalog ate juntar
// TARGET_RECOMMENDED (ou acabar as paginas / bater MAX_PAGES). Resiliente:
// qualquer erro -> retorna [] (a secao degrada e some). Cacheia em modulo.
export async function getRecommendedHotels(): Promise<Hotel[]> {
  if (cache) return cache;

  try {
    const hotels: Hotel[] = [];
    for (let page = 1; page <= MAX_PAGES && hotels.length < TARGET_RECOMMENDED; page++) {
      const items = await fetchCatalogPage(page);
      if (items.length === 0) break; // fim do inventario

      for (const item of items) {
        if (Number(item.stars) !== 5) continue;
        const hotel = toHotel(item);
        if (hotel) hotels.push(hotel);
        if (hotels.length >= TARGET_RECOMMENDED) break;
      }
    }

    console.log(`[catalog] recomendados 5★: ${hotels.length}`);
    // So cacheia resultado nao-vazio: se veio vazio (erro/formato), tenta de
    // novo no proximo mount em vez de "grudar" a lista vazia na sessao.
    if (hotels.length > 0) cache = hotels;
    return hotels;
  } catch (err) {
    console.warn('[catalog] getRecommendedHotels failed:', err);
    return [];
  }
}
