import { sha256 } from 'js-sha256';

import { endpoints } from '@/src/config/env';

// ----------------------------------------------------------------------------
// Partner SSO da TripEdge: abre o marketplace com o usuario JA LOGADO.
//
// Fluxo (contrato TripEdge): GET {base}/api/auth/partner?account_id&ts&sig&return_to
// responde 302 com um cookie de sessao e redireciona para return_to. Basta
// carregar essa URL num WebView - ele segue o 302 e grava o cookie.
//
// Assinatura: sig = HMAC_SHA256("<account_id>|<ts>", secret) em hex (mesmo
// calculo do pre-request do Postman: CryptoJS.HmacSHA256(payload, secret)).
//
// O `secret` NAO e mais hardcode: vem do payload de SignIn (marketplaceSSoSecret,
// persistido em account.marketplaceSSoSecret) e e passado pelo chamador. A
// assinatura HMAC ainda acontece no app; ANTES DE PRODUCAO, o ideal e mover a
// assinatura para o backend (guarda o segredo, assina e devolve a URL; o app so
// chama um endpoint autenticado). Tudo isolado neste arquivo para essa migracao
// ser trivial.
//
// secret vazio/ausente => buildPartnerSsoUrl retorna null (SSO indisponivel, ex.:
// sessao antiga que ainda nao recebeu o segredo via re-signin).
// ----------------------------------------------------------------------------

const PARTNER_SSO_BASE_URL = endpoints.tripEdgeSite;

// Monta a URL assinada do Partner SSO. Retorna null quando nao da para assinar
// (sem segredo disponivel ou sem accountId) - o chamador cai num estado de erro.
export function buildPartnerSsoUrl(
  accountId: string,
  returnTo: string,
  secret: string | null | undefined,
): string | null {
  if (!secret || !accountId) return null;

  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = `${accountId}|${ts}`;
  const sig = sha256.hmac(secret, payload);

  const query =
    `account_id=${encodeURIComponent(accountId)}` +
    `&ts=${encodeURIComponent(ts)}` +
    `&sig=${encodeURIComponent(sig)}` +
    `&return_to=${encodeURIComponent(returnTo)}`;

  return `${PARTNER_SSO_BASE_URL}/api/auth/partner?${query}`;
}
