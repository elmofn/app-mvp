import type { SupportedLang } from './locale';
import { captureHandledError } from './telemetry';

// ----------------------------------------------------------------------------
// Cliente do Gemini (Google Generative Language API) - usado para CURAR os
// destinos de "Next Trip Ideas" da home: entre as cidades REAIS que a TripEdge
// devolve (src/services/places.ts), o modelo escolhe as mais turisticas
// (capital / litoral / turistica) por faixa de distancia, em vez do sorteio
// geometrico. Nunca inventa cidade: so referencia placeIds da lista recebida.
//
// ============================================================================
// SEGURANCA DA CHAVE - progressao em fases (isolada NESTE arquivo de proposito):
//
//   Fase 1 (ATUAL / prototipo): a chave vai HARDCODED no bundle (via
//     EXPO_PUBLIC_GEMINI_API_KEY ou o literal abaixo). Ela PODE ser extraida do
//     app. Aceitavel por ~1 mes COM as 4 travas (vide docs/PRODUCTION_READINESS):
//     restringir a chave a Generative Language API + package/SHA-1/bundle id;
//     teto de orcamento + quota; modelo barato + cache; rotacao. Mesmo padrao da
//     TRIPEDGE_PARTNER_KEY (places.ts) e do PARTNER_SSO_SECRET (partnerSso.ts).
//
//   Fase 2 (ANTES DE ESCALAR) - RECOMENDADO: o backend faz PROXY da chamada
//     (app -> backend -> Gemini). A chave fica server-side e NUNCA toca o device
//     = de fato seguro. No app muda so o corpo de `callGemini` (chamar o endpoint
//     em vez do Google); `generateDestinations` e o resto do fluxo nao mudam.
//     Alternativa consciente: o backend manda a chave no payload do signin
//     (melhor que hardcoded, mas ainda extraivel por usuario logado).
//
// Por isso `callGemini` e o UNICO ponto que conhece o transporte/chave: a
// migracao para proxy (ou Firebase AI Logic + App Check) e um swap de 1 funcao.
// ============================================================================

// ⚠️ TEMPORARIO / Fase 1 - preencher com a chave restrita (ou definir
// EXPO_PUBLIC_GEMINI_API_KEY no ambiente de build). Vazio => generateDestinations
// devolve null e a home cai na selecao geometrica atual (degrada, nao quebra).
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Modelo barato o suficiente para uma curadoria de ~1 chamada por login.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
// Teto por tentativa. 15s: em rede movel a curadoria (saida estruturada) as
// vezes passa de 8-12s e abortava, caindo no fallback geometrico. Como a espera
// agora tem contexto (tela/linha de loading com "Carregando suas sugestoes de
// viagem" enquanto o signIn/refresh resolve), podemos dar mais folga ao modelo.
// Raro chegar perto disso - o comum responde em 1-3s.
const GEMINI_TIMEOUT_MS = 15000;
// Tentativas totais (1 original + 1 retry). O retry cobre apenas falhas
// TRANSITORIAS de servidor (429, 5xx) ou resposta malformada. NAO re-tentamos
// em timeout (AbortError): repetir com o mesmo teto quase nunca ajuda e so
// dobra a espera no caminho do login. Erros permanentes (4xx) tambem nao.
const GEMINI_MAX_ATTEMPTS = 2;

// ----------------------------------------------------------------------------
// callGemini: transporte UNICO e trocavel (vide bloco de seguranca acima).
// Fase 1 -> POST REST do Google com saida estruturada (responseSchema). Devolve
// o JSON ja parseado (tipo T) ou null em QUALQUER falha (chave vazia, rede,
// timeout, HTTP != 200, JSON invalido) - o chamador decide o fallback.
// ----------------------------------------------------------------------------
async function callGemini<T>(
  prompt: string,
  responseSchema: Record<string, unknown>,
  opts?: { key?: string; timeoutMs?: number; attempts?: number },
): Promise<T | null> {
  const key = opts?.key ?? GEMINI_API_KEY;
  if (!key) return null;

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.4,
    },
  };

  const timeoutMs = opts?.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const maxAttempts = opts?.attempts ?? GEMINI_MAX_ATTEMPTS;

  // Ultimo erro inesperado (nao-abort) visto no loop - so reportamos ao Sentry
  // uma vez, depois de esgotar as tentativas, para nao duplicar eventos.
  let lastUnexpectedErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.warn('[gemini] HTTP', response.status, `(tentativa ${attempt}/${maxAttempts})`, text.slice(0, 200));
        // Transitorio (rate-limit / erro de servidor): vale re-tentar. 4xx
        // permanente (chave/modelo/schema) nao - abortamos o loop.
        if (response.status === 429 || response.status >= 500) continue;
        return null;
      }
      const raw = await response.json();
      // Envelope: candidates[0].content.parts[0].text traz o JSON (string) que o
      // responseSchema garante. Parseamos aqui para o chamador receber T pronto.
      const textPart: unknown = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof textPart !== 'string') {
        console.warn('[gemini] resposta sem texto estruturado', `(tentativa ${attempt}/${maxAttempts})`);
        continue; // resposta malformada: pode ser pontual, re-tenta
      }
      return JSON.parse(textPart) as T;
    } catch (err) {
      // Timeout proprio (controller.abort) => AbortError: condicao ESPERADA em
      // rede movel. Nao vira evento no Sentry E nao e re-tentado (repetir com o
      // mesmo teto so dobra a espera). Caimos direto no fallback geometrico.
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      console.warn(`[gemini] call failed (tentativa ${attempt}/${maxAttempts}):`, err);
      if (isAbort) break;
      lastUnexpectedErr = err;
      // erro inesperado de rede: segue para a proxima tentativa (se houver)
    } finally {
      clearTimeout(timer);
    }
  }

  // Esgotou as tentativas: degradamos para o fallback geometrico (null). So
  // reportamos ao Sentry se a ultima falha foi realmente inesperada.
  if (lastUnexpectedErr) captureHandledError(lastUnexpectedErr, { scope: 'callGemini' });
  return null;
}

// ----------------------------------------------------------------------------
// generateDestinations: em vez de RANQUEAR um pool ruim vindo da varredura por
// coordenada (que pega cidades mortas e perde as gemas), o Gemini GERA os
// melhores destinos reais que ele conhece, por banda de distancia a partir do
// device, priorizando o Perfil de Viajante. O content.ts depois RESOLVE cada
// destino para um place_id real via busca por coordenada da TripEdge (as coords
// vem do proprio Gemini). Isso corrige a raiz: a QUALIDADE dos destinos deixa de
// depender da cobertura da TripEdge. Retorna null em qualquer falha.
// ----------------------------------------------------------------------------

// Banda de distancia do destino a partir do device: near -> mid -> far.
export type GenBand = 'near' | 'mid' | 'far';
// Por que a cidade se destaca (vira a tag do card): capital, litoral/praia,
// turistica (ex.: Gramado) ou natureza.
export type GenCategory = 'capital' | 'coastal' | 'touristic' | 'nature';

export type GeneratedDestination = {
  name: string; // cidade
  region: string; // estado/provincia
  country: string;
  lat: number; // coords aproximadas (para resolver o place_id na TripEdge)
  lng: number;
  category: GenCategory;
  band: GenBand;
  description: string; // hook no idioma do usuario
};

const GEN_CATEGORIES: GenCategory[] = ['capital', 'coastal', 'touristic', 'nature'];
const GEN_BANDS: GenBand[] = ['near', 'mid', 'far'];

const LANG_LABEL: Record<SupportedLang, string> = {
  'en-US': 'English',
  'pt-BR': 'Brazilian Portuguese',
  'es-ES': 'Spanish',
};

// Schema da resposta estruturada: lista de destinos reais com coords, categoria,
// banda e hook.
const GEN_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      region: { type: 'string' },
      country: { type: 'string' },
      lat: { type: 'number' },
      lng: { type: 'number' },
      category: { type: 'string', enum: ['capital', 'coastal', 'touristic', 'nature'] },
      band: { type: 'string', enum: ['near', 'mid', 'far'] },
      description: { type: 'string' },
    },
    required: ['name', 'region', 'country', 'lat', 'lng', 'category', 'band', 'description'],
  },
};

// Shape cru que o modelo devolve (antes da nossa validacao).
type RawGen = {
  name?: unknown;
  region?: unknown;
  country?: unknown;
  lat?: unknown;
  lng?: unknown;
  category?: unknown;
  band?: unknown;
  description?: unknown;
};

export async function generateDestinations(
  deviceContext: { city: string; country: string; lat: number; lng: number },
  lang: SupportedLang,
  bandKm: { near: number; mid: number; far: number },
  perBand: number,
  // Dica de preferencias do usuario (Perfil de Viajante), ja formatada em ingles
  // (vide formatPreferenceHint). Prioridade maxima quando presente.
  preferenceHint?: string,
): Promise<GeneratedDestination[] | null> {
  const hint = preferenceHint?.trim();
  const where = deviceContext.city
    ? `${deviceContext.city}${deviceContext.country ? `, ${deviceContext.country}` : ''}`
    : deviceContext.country || 'an unknown location';

  const prompt = [
    'You are a world-class travel expert curating destination ideas for a travel-rewards app.',
    `The user is in ${where} (approx ${deviceContext.lat.toFixed(3)}, ${deviceContext.lng.toFixed(3)}).`,
    '',
    ...(hint
      ? [
          "TOP PRIORITY - the user's travel profile:",
          `  ${hint}`,
          'EVERY suggestion must fit this profile above all else. If the profile points to',
          'nature, interior or off-the-beaten-path places, prioritize those.',
          '',
        ]
      : []),
    'Suggest REAL, well-known travel destinations grouped by distance band FROM THE USER:',
    `  - "near": up to ${bandKm.near} km away`,
    `  - "mid": up to ${bandKm.mid} km away`,
    `  - "far": up to ${bandKm.far} km away`,
    `Give up to ${perBand} destinations per band, ordered best-first.`,
    '',
    `Focus on ${hint ? 'destinations matching the profile, then ' : ''}capitals, beach/coastal cities,`,
    'famous touristic cities, and nature/scenic destinations.',
    ...(hint
      ? []
      : [
          'Do NOT suggest dull interior towns with no tourism. Interior cities are allowed ONLY',
          'if they are famous tourist destinations (e.g. Gramado-RS, Campos do Jordao-SP, Bonito-MS).',
        ]),
    '',
    'For each destination provide:',
    '- name: the city name',
    '- region: the state/province it belongs to',
    '- country',
    "- lat, lng: the city's REAL approximate coordinates in decimal degrees (be as accurate as you can)",
    '- category: capital | coastal | touristic | nature',
    '- band: near | mid | far (its distance band from the user)',
    `- description: one short, vivid hook (max ~90 chars) in ${LANG_LABEL[lang]}. Do NOT include the`,
    '  city/state/country name in the hook (the app shows "City, State" separately).',
    '',
    'Only REAL places with real coordinates. Never invent a city.',
  ].join('\n');

  const result = await callGemini<RawGen[]>(prompt, GEN_RESPONSE_SCHEMA);
  if (!Array.isArray(result)) return null;

  // Validacao defensiva: nome nao-vazio, coords numericas dentro da faixa, banda
  // valida; categoria coagida para um valor valido.
  const out: GeneratedDestination[] = [];
  for (const raw of result as RawGen[]) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    const lat = typeof raw?.lat === 'number' ? raw.lat : NaN;
    const lng = typeof raw?.lng === 'number' ? raw.lng : NaN;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    if (!GEN_BANDS.includes(raw?.band as GenBand)) continue;
    const category: GenCategory = GEN_CATEGORIES.includes(raw?.category as GenCategory)
      ? (raw.category as GenCategory)
      : 'touristic';
    out.push({
      name,
      region: typeof raw?.region === 'string' ? raw.region.trim() : '',
      country: typeof raw?.country === 'string' ? raw.country.trim() : '',
      lat,
      lng,
      category,
      band: raw.band as GenBand,
      description: typeof raw?.description === 'string' ? raw.description.trim() : '',
    });
  }
  return out.length ? out : null;
}
