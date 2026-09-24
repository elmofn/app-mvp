import { z } from 'zod';

import { endpoints } from '@/src/config/env';

const API_BASE_URL = endpoints.travelCashApi;

// ----------------------------------------------------------------------------
// CreateNavigationCode: POST /api/MarketplaceAuth/CreateNavigationCode
// Gera o "codigo de autenticacao" (navigationCode) que o usuario ve no perfil.
// Primeiro endpoint que autentica pelo token (JWT) do SignIn no header, em vez
// de accountId no body. O body vai apenas com { state: '' }.
// ----------------------------------------------------------------------------

const NavigationCodeSchema = z.object({
  navigationCode: z.string(),
  launchUrl: z.string(),
  expiresAt: z.string(), // GMT/UTC, sem offset (ex.: '2026-07-29T16:43:07.117')
  success: z.boolean(),
});

export type NavigationCode = {
  navigationCode: string;
  launchUrl: string;
  expiresAt: string;
};

// Erro tipado carregando o status HTTP para que o chamador distinga um 401
// (token expirado -> re-signin) de outras falhas.
export class NavigationCodeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'NavigationCodeError';
    this.status = status;
  }
}

export async function createNavigationCode(token: string): Promise<NavigationCode> {
  const url = `${API_BASE_URL}/api/MarketplaceAuth/CreateNavigationCode`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ state: '' }),
  });

  if (!response.ok) {
    // Diagnostico: num 401 do middleware JWT do .NET, o header
    // WWW-Authenticate distingue token expirado/invalido ("invalid_token",
    // "The token expired at ...") de problema de esquema. Logamos junto com o
    // corpo para pinpointar a causa sem precisar adivinhar.
    const challenge = response.headers.get('WWW-Authenticate') ?? '';
    const rawBody = await response.text().catch(() => '');
    console.warn(
      '[marketplace] CreateNavigationCode HTTP',
      response.status,
      'challenge:',
      challenge,
      'body:',
      rawBody.slice(0, 300),
    );
    throw new NavigationCodeError(`CreateNavigationCode failed (${response.status})`, response.status);
  }

  const raw = await response.json();
  const parsed = NavigationCodeSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.success) {
    console.warn('[marketplace] CreateNavigationCode invalid response');
    throw new Error('Invalid response from server.');
  }

  const { navigationCode, launchUrl, expiresAt } = parsed.data;
  return { navigationCode, launchUrl, expiresAt };
}

// expiresAt vem em GMT sem offset; anexa 'Z' quando nao ha fuso para o JS
// interpretar como UTC (evita erro do tamanho do fuso do device).
export function expiresAtToMs(expiresAt: string): number {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(expiresAt);
  return Date.parse(hasTz ? expiresAt : `${expiresAt}Z`);
}
