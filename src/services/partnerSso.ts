import { sha256 } from 'js-sha256';

// ----------------------------------------------------------------------------
// Partner SSO da TripEdge: abre o marketplace com o usuario JA LOGADO.
//
// Fluxo (contrato TripEdge): GET {base}/api/auth/partner?account_id&ts&sig&return_to
// responde 302 com um cookie de sessao e redireciona para return_to. Basta
// carregar essa URL num WebView - ele segue o 302 e grava o cookie.
//
// Assinatura: sig = HMAC_SHA256("<account_id>|<ts>", PARTNER_SSO_SECRET) em hex
// (mesmo calculo do pre-request do Postman: CryptoJS.HmacSHA256(payload, secret)).
//
// ⚠️ TEMPORARIO / DEV — o PARTNER_SSO_SECRET fica EMBUTIDO no bundle, entao pode
// ser extraido; quem tiver o segredo forja SSO para QUALQUER account_id. Isto so
// e aceitavel por ser o ambiente DEV (travelback-dev) e segue o mesmo padrao da
// chave sandbox da TripEdge (src/services/places.ts). ANTES DE PRODUCAO, mover a
// assinatura para o backend (o backend guarda o segredo, assina e devolve a URL;
// o app so chama um endpoint autenticado). Tudo isolado neste arquivo para essa
// migracao ser trivial.
//
// PARTNER_SSO_SECRET vazio => buildPartnerSsoUrl retorna null (SSO desabilitado).
// ----------------------------------------------------------------------------

const PARTNER_SSO_BASE_URL = 'https://travelback-dev.tripedge.com';
// ⚠️ placeholder de teste — trocar pelo segredo real (partner_sso_secret) depois.
const PARTNER_SSO_SECRET = 'aaaaa';

// Monta a URL assinada do Partner SSO. Retorna null quando nao da para assinar
// (sem segredo configurado ou sem accountId) - o chamador cai num estado de erro.
export function buildPartnerSsoUrl(accountId: string, returnTo: string): string | null {
  if (!PARTNER_SSO_SECRET || !accountId) return null;

  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = `${accountId}|${ts}`;
  const sig = sha256.hmac(PARTNER_SSO_SECRET, payload);

  const query =
    `account_id=${encodeURIComponent(accountId)}` +
    `&ts=${encodeURIComponent(ts)}` +
    `&sig=${encodeURIComponent(sig)}` +
    `&return_to=${encodeURIComponent(returnTo)}`;

  return `${PARTNER_SSO_BASE_URL}/api/auth/partner?${query}`;
}
