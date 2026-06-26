import {
  SignInBannerSchema,
  SignInNextTripSchema,
  type SignInBanner,
  type SignInNextTrip,
} from './auth';
import type { SupportedLang } from './locale';

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
