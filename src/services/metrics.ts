import { Platform } from 'react-native';
import * as Application from 'expo-application';

import { endpoints } from '@/src/config/env';

// ----------------------------------------------------------------------------
// Metricas de produto ("pixel" de evento). Ponto unico que fala com
// /api/Metrics/Pixel. Generico e reutilizavel: cada evento e identificado por
// um eventId JA CADASTRADO no backend (vide METRIC_EVENTS). Fire-and-forget,
// nunca lanca - medir um clique nao pode atrapalhar o fluxo do usuario.
//
// Privacidade: envia apenas o accountId (id da propria conta) + contexto de
// device/app. Sem PII (nome/email/telefone/geo). First-party.
// ----------------------------------------------------------------------------

const API_BASE_URL = endpoints.travelCashApi;
const PIXEL_TIMEOUT_MS = 4000;

// Catalogo de eventos (eventId cadastrado no backend). Mantido aqui para os
// ids ficarem nomeados num lugar so - adicionar outro botao e uma linha.
export const METRIC_EVENTS = {
  // Clique no botao "Falar no WhatsApp" do suporte (SupportContent).
  WHATSAPP_SUPPORT_CLICK: '41b3da2d-cae8-f111-91f2-002248a5c4a0',
} as const;

type TrackPixelParams = {
  eventId: string;
  accountId: string; // obrigatorio: so disparamos com usuario logado
  language: string; // formato do app, ex.: 'pt-BR'
};

// Dispara um evento de metrica. Resolve sempre (swallow de qualquer erro).
export async function trackPixel(params: TrackPixelParams): Promise<void> {
  const body = {
    eventId: params.eventId,
    accountId: params.accountId,
    trackerId: null, // sempre null no uso in-app (campo e do fluxo de email/campanha)
    platform: Platform.OS,
    // Versao/build do app instalado (binario real), via expo-application -
    // mesmo que o AboutAppModal usa.
    appVersion: Application.nativeApplicationVersion ?? '',
    appBuild: Application.nativeBuildVersion ?? '',
    language: params.language,
  };

  if (__DEV__) console.log('[metrics] Pixel →', body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PIXEL_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/Metrics/Pixel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (__DEV__ && !response.ok) console.warn('[metrics] Pixel HTTP', response.status);
  } catch (err) {
    // Nunca derruba o fluxo: um clique perdido na metrica e aceitavel.
    if (__DEV__) console.warn('[metrics] Pixel falhou:', err);
  } finally {
    clearTimeout(timer);
  }
}
