import type { SupportedLang } from '@/src/services/locale';

import { activate } from './dict/activate';
import { assistant } from './dict/assistant';
import { common } from './dict/common';
import { home } from './dict/home';
import { login } from './dict/login';
import { notifications } from './dict/notifications';
import { settings } from './dict/settings';
import { signup } from './dict/signup';
import { statement } from './dict/statement';
import { subscriptions } from './dict/subscriptions';
import { support } from './dict/support';
import { terms } from './dict/terms';
import { transaction } from './dict/transaction';
import { travelshop } from './dict/travelshop';
import { welcome } from './dict/welcome';

// Cada namespace vive em src/i18n/dict/<ns>.ts e exporta um objeto no formato
// Record<SupportedLang, {...}>. Aqui montamos, por idioma, o dicionario
// completo { namespace: {...chaves} } consumido por useT()/translate().
export type NamespaceDict = Record<SupportedLang, Record<string, unknown>>;

const NAMESPACES: Record<string, NamespaceDict> = {
  common,
  welcome,
  login,
  signup,
  activate,
  home,
  settings,
  statement,
  transaction,
  travelshop,
  subscriptions,
  support,
  terms,
  notifications,
  assistant,
};

const LANGS: SupportedLang[] = ['en-US', 'pt-BR', 'es-ES'];

function buildForLang(lang: SupportedLang): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [ns, dict] of Object.entries(NAMESPACES)) {
    out[ns] = dict[lang] ?? {};
  }
  return out;
}

export const translations: Record<SupportedLang, Record<string, Record<string, unknown>>> = {
  'en-US': buildForLang('en-US'),
  'pt-BR': buildForLang('pt-BR'),
  'es-ES': buildForLang('es-ES'),
};
