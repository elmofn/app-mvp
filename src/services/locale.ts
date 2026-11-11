import * as Localization from 'expo-localization';

import { getLanguageFromCountryId } from './account';
import type { SignInAccountDetails } from './auth';

export type SupportedLang = 'pt-BR' | 'en-US' | 'es-ES';

export const DEFAULT_LANG: SupportedLang = 'en-US';

// Mapeia qualquer string locale (ex.: "pt", "pt_BR", "pt-br", "es-MX") para
// um dos idiomas suportados pelo backend. Casos nao reconhecidos caem no
// DEFAULT_LANG. Mantemos a logica aqui para que toda a stack (FAQ, futura
// criacao de conta, ativacao) consulte a mesma fonte.
function normalize(raw: string | null | undefined): SupportedLang {
  if (!raw) return DEFAULT_LANG;
  const lower = raw.toLowerCase().replace('_', '-');
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es-ES';
  if (lower.startsWith('en')) return 'en-US';
  return DEFAULT_LANG;
}

export function getDeviceLanguage(): SupportedLang {
  // expo-localization devolve uma lista ordenada pelas preferencias do usuario.
  // O primeiro item costuma ser o idioma principal do dispositivo.
  const locales = Localization.getLocales();
  const first = locales[0];
  return normalize(first?.languageTag ?? first?.languageCode);
}

export function getUserLanguage(account: SignInAccountDetails | null): SupportedLang {
  // Fonte de verdade do idioma e o countryId persistido na conta - eh o
  // que o backend usa para resolver qual variante de conteudo entregar.
  // Fallback: setups.lang (legado, mantem compat com sessoes antigas) e,
  // por fim, o idioma do device.
  const fromCountry = getLanguageFromCountryId(account?.account?.countryId);
  if (fromCountry) return fromCountry;
  if (account?.setups?.lang) return normalize(account.setups.lang);
  return getDeviceLanguage();
}
