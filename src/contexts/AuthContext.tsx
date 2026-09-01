import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { getAccount, LANGUAGE_COUNTRY_IDS } from '@/src/services/account';
import { authenticateWithBiometric, getBiometricStatus } from '@/src/services/biometric';
import { getBanners, getGeoNextTrips } from '@/src/services/content';
import { captureHandledError } from '@/src/services/telemetry';
import { getFAQ, type FAQItem } from '@/src/services/faq';
import { formatLocationPayload, getCachedLocation, getCurrentLocation } from '@/src/services/location';
import { getUserLanguage, type SupportedLang } from '@/src/services/locale';
import {
  signIn as apiSignIn,
  SignInAccountDetails,
  SignInCurrency,
  SignInResponse,
} from '@/src/services/auth';
import {
  clearSession,
  loadCredentials,
  loadSession,
  saveCredentials,
  saveSession,
} from '@/src/services/storage';

type AuthState = {
  account: SignInAccountDetails | null;
  token: string | null;
};

// Estado compartilhado da FAQ (GetFAQ). Fica no AuthContext, junto com o
// resto do conteudo localizado, para que a tela de support (FAQSection) e o
// pull-to-refresh da home leiam/atualizem a mesma fonte.
type FAQState = { items: FAQItem[]; loading: boolean; error: boolean };

type AuthContextValue = AuthState & {
  isRestoring: boolean;
  isSigningIn: boolean;
  isLocked: boolean;
  biometricAvailable: boolean;
  faq: FAQState;
  signIn: (login: string, password: string) => Promise<SignInResponse>;
  refreshSession: () => Promise<string | null>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  lock: () => void;
  updateAccountDetails: (patch: AccountPatch) => Promise<void>;
  refreshAccount: (langOverride?: SupportedLang) => Promise<void>;
  reloadFAQ: (langOverride?: SupportedLang) => Promise<void>;
};

export type AccountPatch = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  lang?: string;
  // countryId eh a fonte de verdade do idioma do usuario (espelha o que
  // o backend persiste em account.countryId). Atualizamos junto com lang
  // quando o picker de idioma muda no settings.
  countryId?: string;
  // Currency vem inteira do picker (id + code + name + symbol + rate);
  // gravamos junto com defaultCurrencyId para manter os dois campos do
  // setups consistentes entre si.
  currency?: SignInCurrency;
  // Flags de verificacao de contato - viram true depois que o ValidateCode
  // confirma o codigo (ex.: verificacao de telefone via SMS no settings).
  validEmail?: boolean;
  validPhoneNumber?: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ account: null, token: null });
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  // Comeca em loading para o primeiro render do FAQSection ja mostrar o
  // spinner (em vez de piscar o estado vazio antes do fetch inicial).
  const [faq, setFaq] = useState<FAQState>({ items: [], loading: true, error: false });

  // Mantemos um ref do state atual para o AppState listener acessar sem
  // virar dependencia (re-attachar listener a cada render seria caro).
  const stateRef = useRef(state);
  stateRef.current = state;
  const biometricAvailableRef = useRef(false);
  biometricAvailableRef.current = biometricAvailable;

  // Boot: restaura sessao, dispara location e checa hardware biometrico.
  useEffect(() => {
    // Disparo da geolocation eh fire-and-forget - n bloqueia o boot. O
    // resultado fica cacheado em getCachedLocation() para o proximo signIn.
    getCurrentLocation().catch(() => undefined);

    Promise.all([loadSession(), getBiometricStatus()])
      .then(([session, status]) => {
        const available = status === 'available';
        setBiometricAvailable(available);
        if (session) {
          setState({ account: session.account, token: session.token });
          // Se havia sessao persistida + biometria disponivel, ja entra
          // travado - o BiometricGate exibe o prompt assim que renderiza.
          if (available) {
            setIsLocked(true);
          }
        }
      })
      .finally(() => setIsRestoring(false));
  }, []);

  // AppState: ao voltar do background com sessao ativa + biometria, tranca
  // a sessao para forcar nova autenticacao biometrica.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (stateRef.current.token && biometricAvailableRef.current) {
          setIsLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    setIsSigningIn(true);
    try {
      // Usa a coord cacheada se ja temos. Se ainda nao chegou, tenta
      // fetchar agora (provavelmente vem rapido em rede + GPS quente).
      let coords = getCachedLocation();
      if (!coords) coords = await getCurrentLocation();
      const geolocation = formatLocationPayload(coords);

      const response = await apiSignIn(login, password, geolocation);
      if (response.success && response.token && response.accountDetails) {
        // Banners e nextTrips agora vem de endpoints de conteudo dedicados
        // (GetBanners/GetNextTrips), localizados pelo idioma da conta. Falha
        // aqui nao deve barrar o login - caimos no que o payload de SignIn
        // tiver trazido.
        const lang = getUserLanguage(response.accountDetails);
        let { banners, nextTrips } = response.accountDetails;
        try {
          // nextTrips agora vem da geolocalizacao (TripEdge), com fallback ao
          // backend dentro de getNextTripsNearby. coords ja foi resolvido acima.
          [banners, nextTrips] = await Promise.all([
            getBanners(lang),
            getGeoNextTrips(coords, lang),
          ]);
        } catch (err) {
          captureHandledError(err, { scope: 'signIn.contentFetch' });
          console.warn('[auth] content fetch on signIn failed, using payload:', err);
        }
        const account: SignInAccountDetails = { ...response.accountDetails, banners, nextTrips };
        setState({ account, token: response.token });
        await saveSession(response.token, account);
        // Guarda as credenciais (cifradas) para permitir re-signin silencioso
        // quando o token expirar - vide refreshSession.
        await saveCredentials(login, password);
        setIsLocked(false);
      }
      return response;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  // Renova o token via re-signin silencioso com as credenciais guardadas.
  // Chamado quando um endpoint autenticado pelo token retorna 401 (token do
  // SignIn dura ~1h). Mantem o account atual em memoria - so troca o token.
  // Retorna o novo token, ou null se nao ha credenciais / o re-signin falhou.
  const refreshSession = useCallback(async (): Promise<string | null> => {
    const creds = await loadCredentials();
    if (!creds) {
      // Sessao restaurada/destravada por biometria sem login novo apos esta
      // feature -> nao ha credenciais salvas. Precisa de login manual.
      console.warn('[auth] refreshSession: no stored credentials (needs fresh login)');
      return null;
    }
    try {
      let coords = getCachedLocation();
      if (!coords) coords = await getCurrentLocation();
      const geolocation = formatLocationPayload(coords);
      const response = await apiSignIn(creds.login, creds.password, geolocation);
      if (response.success && response.token) {
        const current = stateRef.current;
        const account = current.account ?? response.accountDetails ?? null;
        if (!account) return null;
        setState({ account, token: response.token });
        await saveSession(response.token, account);
        return response.token;
      }
      return null;
    } catch (err) {
      captureHandledError(err, { scope: 'refreshSession' });
      console.warn('[auth] refreshSession failed:', err);
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState({ account: null, token: null });
    setIsLocked(false);
    await clearSession();
  }, []);

  const unlock = useCallback(async () => {
    const result = await authenticateWithBiometric('Unlock TravelBACK');
    if (result.success) {
      setIsLocked(false);
      return true;
    }
    console.warn('[auth] unlock failed:', result.error, result.warning);
    return false;
  }, []);

  const lock = useCallback(() => {
    if (stateRef.current.token) setIsLocked(true);
  }, []);

  // Aplica um patch parcial no account em memoria e re-salva o cache. Usado
  // pelo settings depois que UpdateAccount retorna 200 - mantem o app
  // refletindo o novo estado sem precisar de re-login.
  const updateAccountDetails = useCallback(async (patch: AccountPatch) => {
    const current = stateRef.current;
    if (!current.account || !current.token) return;
    const next: SignInAccountDetails = {
      ...current.account,
      accountDetails: {
        ...current.account.accountDetails,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.phoneNumber !== undefined ? { phoneNumber: patch.phoneNumber } : {}),
        ...(patch.validEmail !== undefined ? { validEmail: patch.validEmail } : {}),
        ...(patch.validPhoneNumber !== undefined
          ? { validPhoneNumber: patch.validPhoneNumber }
          : {}),
      },
      account: {
        ...current.account.account,
        ...(patch.countryId !== undefined ? { countryId: patch.countryId } : {}),
      },
      setups: {
        ...current.account.setups,
        ...(patch.lang !== undefined ? { lang: patch.lang } : {}),
        ...(patch.currency !== undefined
          ? { currency: patch.currency, defaultCurrencyId: patch.currency.id }
          : {}),
      },
    };
    setState({ account: next, token: current.token });
    await saveSession(current.token, next);
  }, []);

  // Busca a FAQ (GetFAQ) no idioma informado, ou no idioma atual da conta se
  // omitido. Estado unico compartilhado com o FAQSection (tela de support) e
  // usado pelo pull-to-refresh da home. Resiliente: um erro vira flag e nao
  // derruba quem chamou.
  const reloadFAQ = useCallback(async (langOverride?: SupportedLang) => {
    const lang = langOverride ?? getUserLanguage(stateRef.current.account);
    setFaq((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const items = await getFAQ(lang);
      setFaq({ items, loading: false, error: false });
    } catch (err) {
      captureHandledError(err, { scope: 'reloadFAQ' });
      console.warn('[auth] FAQ reload failed:', err);
      setFaq((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  // Re-busca o snapshot completo da conta sem novo login: GetAccount traz
  // accountDetails/balance/setups/statements, e GetBanners/GetNextTrips
  // (que sairam do payload de SignIn) trazem o conteudo localizado. Usado
  // pelo pull-to-refresh da home. Propaga para o storage como o signIn.
  //
  // langOverride: quando o usuario acabou de trocar idioma/moeda em settings,
  // o estado local ainda nao propagou para o stateRef nesta mesma tick;
  // passar o idioma-alvo garante que banners/nextTrips/FAQ venham no idioma
  // recem escolhido e que countryId/setups.lang refletam essa escolha.
  const refreshAccount = useCallback(async (langOverride?: SupportedLang) => {
    const current = stateRef.current;
    if (!current.account || !current.token) return;
    const accountId = current.account.accountDetails.accountId;
    const lang = langOverride ?? getUserLanguage(current.account);

    // Coords para o nextTrips por geolocalizacao (TripEdge). Usa o cache e so
    // busca se ainda nao temos - mesmo padrao do signIn.
    let coords = getCachedLocation();
    if (!coords) coords = await getCurrentLocation();

    const [snapshot, banners, nextTrips] = await Promise.all([
      getAccount(accountId, lang),
      getBanners(lang),
      getGeoNextTrips(coords, lang),
    ]);

    // O idioma do app e uma preferencia do usuario (countryId/setups.lang, o
    // que getUserLanguage le). Sem override (pull-to-refresh), preservamos a
    // escolha local para nao reverter o idioma. Com override (settings acabou
    // de salvar), adotamos o idioma/pais recem escolhidos. Em ambos, o
    // conteudo ja veio buscado no idioma correto (lang).
    const preservedCountryId = langOverride
      ? LANGUAGE_COUNTRY_IDS[langOverride]
      : current.account.account.countryId;
    const preservedLang = langOverride ?? current.account.setups.lang;
    const next: SignInAccountDetails = {
      ...snapshot,
      banners,
      nextTrips,
      account: { ...snapshot.account, countryId: preservedCountryId },
      setups: { ...snapshot.setups, lang: preservedLang },
    };
    setState({ account: next, token: current.token });
    await saveSession(current.token, next);

    // Junto com o resto do conteudo, repopula a FAQ no mesmo idioma. Resiliente
    // (reloadFAQ trata o proprio erro), entao nao compromete o refresh.
    await reloadFAQ(lang);
  }, [reloadFAQ]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isRestoring,
        isSigningIn,
        isLocked,
        biometricAvailable,
        faq,
        signIn,
        refreshSession,
        signOut,
        unlock,
        lock,
        updateAccountDetails,
        refreshAccount,
        reloadFAQ,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
