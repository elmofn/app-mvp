import { useMemo } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import { DEFAULT_LANG, getUserLanguage, type SupportedLang } from '@/src/services/locale';

import { translations } from './translations';

// Camada de i18n da interface. O idioma ativo NAO tem estado proprio: ele e
// derivado de getUserLanguage(account), a mesma fonte de verdade que o backend
// usa para localizar conteudo (FAQ, banners, etc.). Assim, quando o usuario
// troca o idioma em Settings (que persiste countryId/lang na conta via
// AuthContext), toda a UI re-renderiza no novo idioma automaticamente.

type Vars = Record<string, string | number>;

// Resolve uma chave em notacao de ponto (ex.: "home.greeting") no dicionario
// do idioma atual, com fallback para o idioma padrao.
function resolve(lang: SupportedLang, key: string): unknown {
  const path = key.split('.');
  const fromLang = path.reduce<any>((acc, part) => (acc == null ? acc : acc[part]), translations[lang]);
  if (fromLang !== undefined) return fromLang;
  return path.reduce<any>((acc, part) => (acc == null ? acc : acc[part]), translations[DEFAULT_LANG]);
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

// Versao pura, para uso fora de componentes (ex.: helpers). Prefira useT()
// dentro de componentes para reatividade a troca de idioma.
export function translate(lang: SupportedLang, key: string, vars?: Vars): string {
  const value = resolve(lang, key);
  if (typeof value === 'string') return interpolate(value, vars);
  return key;
}

export interface Translator {
  lang: SupportedLang;
  // Traduz uma chave para string, com interpolacao opcional de {vars}.
  t: (key: string, vars?: Vars) => string;
  // Retorna o no bruto do dicionario (util para listas/arrays de objetos).
  tr: (key: string) => unknown;
}

export function useT(): Translator {
  const { account } = useAuth();
  const lang = getUserLanguage(account);

  return useMemo<Translator>(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      tr: (key) => resolve(lang, key),
    }),
    [lang],
  );
}

export type { SupportedLang };
