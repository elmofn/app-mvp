import * as Sentry from '@sentry/react-native';

// ----------------------------------------------------------------------------
// Telemetria: o UNICO ponto que encaminha ao Sentry os erros que o app TRATA e
// engole (degrada graciosamente). Como esses erros nunca viram crash, sem isto
// ficam invisiveis no painel. O console.warn local continua intacto.
//
// Regras:
// - NUNCA passe payloads crus (rawBody / JWT / PII) aqui. Passe so o Error e um
//   `scope` curto e nao-sensivel (nome da operacao). `extra` apenas com
//   metadados nao-sensiveis (status HTTP, contagens, etc.).
// - Nunca lanca: telemetria nao pode quebrar o fluxo do app.
// - E o unico modulo de servico que conhece o Sentry; os demais chamam este.
//   Assim, silenciar/trocar a telemetria (ou mandar para o backend na Fase 2) e
//   um so ponto.
// ----------------------------------------------------------------------------

type HandledErrorContext = {
  scope: string; // ex.: 'getGeoNextTrips'
  extra?: Record<string, string | number | boolean | null>;
};

export function captureHandledError(error: unknown, context: HandledErrorContext): void {
  try {
    Sentry.captureException(error, {
      tags: { handled: 'true', scope: context.scope },
      extra: context.extra,
    });
  } catch {
    // telemetria nunca derruba o app
  }
}
