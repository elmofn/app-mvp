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

const TARGET_RECOMMENDED = 10; // quantos hoteis 5★ mostramos no carrossel
const POOL_TARGET = 40; // pool maior de 5★ do qual sorteamos os TARGET a exibir
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
  description?: string; // trecho de apresentacao (catalog)
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
    description: z.string().nullable().optional(),
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

  // Endereco "completo": cidade, estado/regiao, pais - cada parte so entra se
  // vier no payload (region costuma vir vazio; country e um codigo, ex.: "EG").
  const location = [h.address?.city, h.address?.region, h.address?.country]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(', ');

  return {
    id: String(h.id ?? name),
    image: resolveImage(rawImage),
    name,
    location,
    rating: 5,
    reviewCount: h.review_count ?? 0,
  };
}

// Embaralha uma copia (Fisher-Yates) para sortear quais recomendados aparecem.
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

// Pool de 5★ (com foto) baixado do catalog. Cacheado em modulo para nao
// re-baixar as paginas a cada visita; sorteamos os recomendados a partir dele.
let pool: Hotel[] | null = null;

// Hoteis 5★ para a secao "Recomendados". Baixa paginas do catalog acumulando um
// pool (POOL_TARGET) de hoteis 5★ COM FOTO — hoteis sem imagem sao descartados
// por toHotel() e o loop simplesmente segue para o proximo item. Depois sorteia
// TARGET_RECOMMENDED do pool, para o usuario nao ver sempre os mesmos hoteis.
// Resiliente: qualquer erro -> retorna [] (a secao degrada e some).
export async function getRecommendedHotels(): Promise<Hotel[]> {
  if (pool) return shuffle(pool).slice(0, TARGET_RECOMMENDED);

  try {
    const hotels: Hotel[] = [];
    for (let page = 1; page <= MAX_PAGES && hotels.length < POOL_TARGET; page++) {
      const items = await fetchCatalogPage(page);
      if (items.length === 0) break; // fim do inventario

      for (const item of items) {
        if (Number(item.stars) !== 5) continue;
        const hotel = toHotel(item); // null = sem foto/nome -> pula pro proximo
        if (hotel) hotels.push(hotel);
        if (hotels.length >= POOL_TARGET) break;
      }
    }

    console.log(`[catalog] pool de recomendados 5★: ${hotels.length}`);
    // So cacheia pool nao-vazio: se veio vazio (erro/formato), tenta de novo no
    // proximo mount em vez de "grudar" a lista vazia na sessao.
    if (hotels.length > 0) pool = hotels;
    return shuffle(hotels).slice(0, TARGET_RECOMMENDED);
  } catch (err) {
    console.warn('[catalog] getRecommendedHotels failed:', err);
    return [];
  }
}
