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
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 4000; // teto curto: se demorar, a home usa o fallback

// ----------------------------------------------------------------------------
// callGemini: transporte UNICO e trocavel (vide bloco de seguranca acima).
// Fase 1 -> POST REST do Google com saida estruturada (responseSchema). Devolve
// o JSON ja parseado (tipo T) ou null em QUALQUER falha (chave vazia, rede,
// timeout, HTTP != 200, JSON invalido) - o chamador decide o fallback.
// ----------------------------------------------------------------------------
async function callGemini<T>(
  prompt: string,
  responseSchema: Record<string, unknown>,
  opts?: { key?: string; timeoutMs?: number },
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? GEMINI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('[gemini] HTTP', response.status, text.slice(0, 200));
      return null;
    }
    const raw = await response.json();
    // Envelope: candidates[0].content.parts[0].text traz o JSON (string) que o
    // responseSchema garante. Parseamos aqui para o chamador receber T pronto.
    const textPart: unknown = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof textPart !== 'string') return null;
    return JSON.parse(textPart) as T;
  } catch (err) {
    captureHandledError(err, { scope: 'callGemini' });
    console.warn('[gemini] call failed:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------------------------------------------------------
// rankDestinations: dada a lista de candidatas REAIS (com placeId) e o contexto
// do device, pede ao Gemini uma SHORTLIST ranqueada das cidades mais turisticas
// por faixa (nearby / regional / international) - nao so a melhor. O app sorteia
// dentro da shortlist (vide content.ts) para variar o place a cada login/refresh
// sem perder a curadoria (o Gemini ordenaria sempre igual). O responseSchema
// forca o modelo a devolver APENAS placeIds da lista (anti-alucinacao) + uma
// categoria e uma descricao atraente no idioma do usuario. Retorna null em
// qualquer falha (chamador cai no fallback geometrico).
// ----------------------------------------------------------------------------

export type RankTier = 'nearby' | 'regional' | 'international';
export type RankCategory = 'capital' | 'coastal' | 'touristic';

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

// Teto da shortlist por tier: o suficiente para variar sem inflar tokens/latencia.
const MAX_PICKS_PER_TIER = 4;
const RANK_CATEGORIES: RankCategory[] = ['capital', 'coastal', 'touristic'];

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
      tier: { type: 'string', enum: ['nearby', 'regional', 'international'] },
      picks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            placeId: { type: 'string' },
            category: { type: 'string', enum: ['capital', 'coastal', 'touristic'] },
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
): Promise<RankTierResult[] | null> {
  if (candidates.length === 0) return null;

  // Lista compacta - so o que o modelo precisa para escolher (economiza tokens).
  const lines = candidates
    .map(
      (c) =>
        `- placeId=${c.placeId} | ${c.name}${c.region ? `, ${c.region}` : ''}, ${c.country} | ${Math.round(c.distanceKm)}km | tier=${c.tier}`,
    )
    .join('\n');

  const prompt = [
    'You are a travel curator for a global travel app.',
    `The user is near ${deviceContext.city || 'unknown'}, ${deviceContext.country || 'unknown'}.`,
    'From the candidate cities below (all real), rank the MOST travel-worthy cities',
    'for EACH tier present (nearby, regional, international). Prefer capitals, coastal/beach',
    'cities and well-known touristic destinations; AVOID dull inland towns with no tourism.',
    'Rules:',
    '- Use ONLY placeId values from the list. Never invent a city or a placeId.',
    `- For each tier present, return "picks": up to ${MAX_PICKS_PER_TIER} cities ordered best-first.`,
    '  Include only genuinely appealing cities; fewer is fine if only a few stand out.',
    '- Only include tiers that appear in the list.',
    `- Write each "description" as a short, appealing one-line hook (max ~90 chars) in ${LANG_LABEL[lang]}.`,
    '- "category" must reflect why the city stands out: capital | coastal | touristic.',
    '',
    'Candidates:',
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
  const validTiers: RankTier[] = ['nearby', 'regional', 'international'];
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
