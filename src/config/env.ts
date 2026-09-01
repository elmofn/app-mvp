// ----------------------------------------------------------------------------
// Camada de ambiente: o UNICO lugar que resolve as URLs base por ambiente.
//
// Selecionado por EXPO_PUBLIC_APP_ENV (o Expo faz inline dessa var no bundle no
// momento do build/start):
//   - "production"            -> setado no perfil `production` do eas.json.
//   - qualquer outro / ausente -> staging (default: `expo start`, perfis
//                                 development e preview).
//
// URLs NAO sao segredo, entao os dois conjuntos ficam versionados aqui (explicito
// e diffavel). O que troca entre builds e apenas EXPO_PUBLIC_APP_ENV.
//
// Segredos (partner key da TripEdge, PARTNER_SSO_SECRET, chave do Gemini) NAO
// entram aqui: sao especificos de ambiente tambem, mas migram para o backend na
// Fase 2 (vide docs/PRODUCTION_READINESS.md).
// ----------------------------------------------------------------------------

export type AppEnv = 'staging' | 'production';

export const APP_ENV: AppEnv =
  process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 'production' : 'staging';

type Endpoints = {
  // Backend proprio (conta, auth, financeiro, conteudo, alertas, faq, busca).
  travelCashApi: string;
  // TripEdge - busca de places / catalogo (autentica pela partner key).
  tripEdgeSearch: string;
  // TripEdge - site (Partner SSO + busca de hoteis; autentica pelo cookie de sessao).
  tripEdgeSite: string;
};

const ENDPOINTS: Record<AppEnv, Endpoints> = {
  staging: {
    travelCashApi: 'https://travelcash-api-stg.azurewebsites.net',
    tripEdgeSearch: 'https://prod-rv-search.tripedge.com',
    tripEdgeSite: 'https://travelback-dev.tripedge.com',
  },
  production: {
    travelCashApi: 'https://travelcash-api-prd.azurewebsites.net',
    tripEdgeSearch: 'https://prod-rv-search.tripedge.com',
    tripEdgeSite: 'https://shop.travelback.com',
  },
};

export const endpoints: Endpoints = ENDPOINTS[APP_ENV];

// Guarda de configuracao: se um build de producao selecionar um endpoint ainda
// vazio (ex.: TripEdge de prod nao preenchido), avisa alto no console. Nunca
// derruba o app - so torna o erro de config visivel em vez de silencioso.
if (APP_ENV === 'production') {
  const missing = (Object.keys(endpoints) as (keyof Endpoints)[]).filter((k) => !endpoints[k]);
  if (missing.length > 0) {
    console.error(
      `[config] URLs de producao ausentes: ${missing.join(', ')} — preencher em src/config/env.ts`,
    );
  }
}
