// ----------------------------------------------------------------------------
// Feature flags do app. Hoje o unico flag e o "Perfil de Viajante", liberado
// apenas para uma allowlist de e-mails internos: assim podemos subir uma build
// de PRODUCAO com a feature embutida, mas visivel/funcional so para essas
// contas (o resto do app nao muda para ninguem fora da lista).
// ----------------------------------------------------------------------------

// E-mails com acesso ao Perfil de Viajante. Normalizados (lowercase) na
// comparacao, entao pode manter a grafia legivel aqui.
export const TRAVELER_PROFILE_ALLOWLIST: string[] = [
  'elmo@travelback.com',
  'felipe@travelback.com',
  'fabio@travelback.com',
  'carlos@travelback.com',
];

const ALLOWLIST_NORMALIZED = new Set(
  TRAVELER_PROFILE_ALLOWLIST.map((e) => e.trim().toLowerCase()),
);

// true se o e-mail da conta logada esta na allowlist do Perfil de Viajante.
// Usado tanto para exibir a entrada no settings quanto para decidir se as
// preferencias entram no prompt do Gemini.
export function canUseTravelerProfile(email?: string | null): boolean {
  if (!email) return false;
  return ALLOWLIST_NORMALIZED.has(email.trim().toLowerCase());
}
