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
//     em vez do Google); `rankDestinations` e o resto do fluxo nao mudam.
//     Alternativa consciente: o backend manda a chave no payload do signin
//     (melhor que hardcoded, mas ainda extraivel por usuario logado).
//
// Por isso `callGemini` e o UNICO ponto que conhece o transporte/chave: a
// migracao para proxy (ou Firebase AI Logic + App Check) e um swap de 1 funcao.
// ============================================================================

// ⚠️ TEMPORARIO / Fase 1 - preencher com a chave restrita (ou definir
// EXPO_PUBLIC_GEMINI_API_KEY no ambiente de build). Vazio => rankDestinations
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
// rankDestinations: dada a lista de candidatas REAIS (com placeId) e o contexto
// do device, pede ao Gemini uma SHORTLIST ranqueada das cidades mais atraentes
// por banda de distancia (near / mid / far) - nao so a melhor. Prioridade: o
// Perfil de Viajante (preferenceHint) manda; sem perfil, foco em capitais,
// praias, cidades turisticas e natureza (interior so se turistico). O app
// sorteia dentro da shortlist (vide content.ts) para variar a cada refresh. O
// responseSchema forca o modelo a devolver APENAS placeIds da lista (anti-
// alucinacao) + categoria + hook no idioma do usuario. null em qualquer falha.
// ----------------------------------------------------------------------------

// Bandas de distancia (ordem de proximidade): near (mais perto) -> mid (~400km)
// -> far (~1000km). O card 1 sai de 'near', depois 'mid', depois 'far'.
export type RankTier = 'near' | 'mid' | 'far';
// Por que a cidade se destaca (vira a tag do card): capital, litoral/praia,
// turistica (ex.: Gramado) ou natureza.
export type RankCategory = 'capital' | 'coastal' | 'touristic' | 'nature';

export type RankCandidate = {
  placeId: string;
  name: string;
  region: string;
  country: string;
  distanceKm: number;
  tier: RankTier;
};

// Uma cidade curada (dentro de um tier).
export type RankPick = {
  placeId: string;
  category: RankCategory;
  description: string;
};

// Shortlist ranqueada (melhor primeiro) de um tier.
export type RankTierResult = {
  tier: RankTier;
  picks: RankPick[];
};

// Teto da shortlist por tier. Maior (8) de proposito: o app SORTEIA dentro da
// shortlist a cada refresh (vide content.ts), entao uma lista mais longa =
// mais variedade de cidades mostradas, em vez de repetir sempre as 2-3 do topo.
const MAX_PICKS_PER_TIER = 8;
const RANK_CATEGORIES: RankCategory[] = ['capital', 'coastal', 'touristic', 'nature'];

const LANG_LABEL: Record<SupportedLang, string> = {
  'en-US': 'English',
  'pt-BR': 'Brazilian Portuguese',
  'es-ES': 'Spanish',
};

// Schema (subset OpenAPI aceito pelo Gemini) da resposta estruturada: por tier,
// uma shortlist ranqueada (melhor primeiro).
const RANK_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      tier: { type: 'string', enum: ['near', 'mid', 'far'] },
      picks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            placeId: { type: 'string' },
            category: { type: 'string', enum: ['capital', 'coastal', 'touristic', 'nature'] },
            description: { type: 'string' },
          },
          required: ['placeId', 'category', 'description'],
        },
      },
    },
    required: ['tier', 'picks'],
  },
};

// Shape cru que o modelo devolve (antes da nossa validacao).
type RawTierResult = { tier?: unknown; picks?: unknown };
type RawPick = { placeId?: unknown; category?: unknown; description?: unknown };

export async function rankDestinations(
  candidates: RankCandidate[],
  deviceContext: { city: string; country: string },
  lang: SupportedLang,
  // Dica de preferencias do usuario (Perfil de Viajante), ja formatada em
  // ingles (vide formatPreferenceHint). Opcional: so chega preenchida para
  // usuarios da allowlist que preencheram o perfil; vazio => prompt atual.
  preferenceHint?: string,
): Promise<RankTierResult[] | null> {
  if (candidates.length === 0) return null;

  // Lista compacta - so o que o modelo precisa para escolher (economiza tokens).
  const lines = candidates
    .map(
      (c) =>
        `- placeId=${c.placeId} | ${c.name}${c.region ? `, ${c.region}` : ''}, ${c.country} | ${Math.round(c.distanceKm)}km | band=${c.tier}`,
    )
    .join('\n');

  const hint = preferenceHint?.trim();
  const prompt = [
    'You are an expert travel curator for a travel-rewards app. Your job is to pick',
    'the most travel-worthy destinations to inspire the user\'s next trip.',
    '',
    `The user is currently in ${deviceContext.city || 'an unknown city'}, ${deviceContext.country || 'an unknown country'}.`,
    'The candidate cities below are REAL and grouped by distance band:',
    '  near = closest to the user | mid = up to ~400km | far = up to ~1000km.',
    '',
    // Prioridade 1: Perfil do Viajante. Quando existe, manda no ranqueamento.
    ...(hint
      ? [
          'TOP PRIORITY - the user\'s travel profile:',
          `  ${hint}`,
          'Rank destinations that fit this profile ABOVE everything else. When the profile',
          'points to nature, interior or off-the-beaten-path places, include those even if',
          'they are small - as long as they genuinely fit the profile.',
          '',
        ]
      : []),
    'Pick the BEST destinations for EACH band that appears, in this order of appeal:',
    `  ${hint ? 'first, whatever matches the profile above; then ' : ''}capitals, beach/coastal`,
    '  cities, well-known touristic cities, and nature/scenic destinations.',
    ...(hint
      ? []
      : [
          'DEFAULT RULE (no profile): do NOT pick dull interior towns with no tourism.',
          'The ONLY interior cities allowed are well-known touristic ones (e.g. Gramado-RS,',
          'Campos do Jordao-SP, Bonito-MS). When in doubt, leave it out.',
        ]),
    '',
    'Rules:',
    '- Use ONLY placeId values from the list. NEVER invent a city or a placeId.',
    `- For each band present, return "picks": a DIVERSE shortlist of up to ${MAX_PICKS_PER_TIER}`,
    '  genuinely appealing cities, ordered best-first. Give SEVERAL options (not just one)',
    '  so the app can vary which it shows. Fewer is fine if only a few truly stand out.',
    '- Only include bands that actually appear in the candidate list.',
    '- "category" = the single best reason it stands out: capital | coastal | touristic | nature.',
    `- "description" = one short, vivid hook (max ~90 chars) in ${LANG_LABEL[lang]} that makes`,
    '  the user want to go. Do NOT put the city or state/country name in the hook (the app',
    '  already shows "City, State" next to it).',
    '',
    'Candidates (placeId | city, state, country | distance | band):',
    lines,
  ].join('\n');

  const result = await callGemini<RawTierResult[]>(prompt, RANK_RESPONSE_SCHEMA);
  if (!Array.isArray(result)) return null;

  // Defesa extra (o schema ja restringe, mas o modelo pode escorregar):
  // - so tiers validos, 1 entrada por tier;
  // - dentro do tier, so placeIds que existem nas candidatas, sem repetir,
  //   ate o teto da shortlist;
  // - categoria coagida para um valor valido.
  const validIds = new Set(candidates.map((c) => c.placeId));
  const validTiers: RankTier[] = ['near', 'mid', 'far'];
  const seenTiers = new Set<RankTier>();
  const out: RankTierResult[] = [];

  for (const item of result as RawTierResult[]) {
    const tier = item?.tier as RankTier;
    if (!validTiers.includes(tier) || seenTiers.has(tier)) continue;
    if (!Array.isArray(item.picks)) continue;

    const usedInTier = new Set<string>();
    const picks: RankPick[] = [];
    for (const raw of item.picks as RawPick[]) {
      const id = raw?.placeId;
      if (typeof id !== 'string' || !validIds.has(id) || usedInTier.has(id)) continue;
      usedInTier.add(id);
      const category: RankCategory = RANK_CATEGORIES.includes(raw?.category as RankCategory)
        ? (raw.category as RankCategory)
        : 'touristic';
      picks.push({
        placeId: id,
        category,
        description: typeof raw?.description === 'string' ? raw.description : '',
      });
      if (picks.length >= MAX_PICKS_PER_TIER) break;
    }

    if (picks.length) {
      seenTiers.add(tier);
      out.push({ tier, picks });
    }
  }

  return out.length ? out : null;
}
