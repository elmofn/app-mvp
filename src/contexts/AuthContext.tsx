import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { canUseTravelerProfile } from '@/src/config/featureFlags';
import { getAccount, LANGUAGE_COUNTRY_IDS } from '@/src/services/account';
import { confirmRead } from '@/src/services/alerts';
import { authenticateWithBiometric, getBiometricStatus } from '@/src/services/biometric';
import { formatPreferenceHint, loadTravelerProfile } from '@/src/services/travelerProfile';
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
  // true enquanto os "Proximos Destinos" carregam em background (pos login/
  // refresh). A home usa para mostrar o loading na secao ate popular.
  nextTripsLoading: boolean;
  // true quando a conta logada tem alguma politica com readed=false, ou seja,
  // precisa aceitar os termos vigentes antes de usar o app (gate geral). Vide
  // TermsGate. Usuarios migrados e atualizacoes de termos caem aqui.
  termsPending: boolean;
  faq: FAQState;
  signIn: (login: string, password: string) => Promise<SignInResponse>;
  refreshSession: () => Promise<string | null>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  lock: () => void;
  updateAccountDetails: (patch: AccountPatch) => Promise<void>;
  refreshAccount: (langOverride?: SupportedLang) => Promise<void>;
  reloadFAQ: (langOverride?: SupportedLang) => Promise<void>;
  // Registra o aceite (ConfirmRead) de todas as politicas pendentes da conta
  // e marca-as como lidas em memoria/cache. Usado pelo TermsGate. Lanca se o
  // registro no backend falhar, para o gate reexibir o erro e nao liberar.
  acceptPolicies: () => Promise<void>;
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

// Contexto do Perfil de Viajante para o nextTrips, derivado da conta:
//  - preferenceHint: enviesa a curadoria do Gemini;
//  - dreamDestination: adiciona o card inspiracional do destino dos sonhos.
// Tudo vazio se o usuario nao esta na allowlist ou nao preencheu o perfil - a
// curadoria segue igual ao comportamento geral. Leitura local barata
// (AsyncStorage por accountId); futuramente pode vir do backend.
async function travelerContextFor(
  account: SignInAccountDetails | null,
): Promise<{ preferenceHint?: string; dreamDestination?: string }> {
  if (!account) return {};
  if (!canUseTravelerProfile(account.accountDetails.email)) return {};
  const profile = await loadTravelerProfile(account.accountDetails.accountId);
  if (!profile) return {};
  return {
    preferenceHint: formatPreferenceHint(profile) || undefined,
    dreamDestination: profile.dreamDestination?.trim() || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ account: null, token: null });
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  // Carregamento dos "Proximos Destinos" (nextTrips). Como a curadoria depende
  // do Gemini (lenta), o nextTrips carrega em BACKGROUND depois do login/refresh
  // - a home renderiza na hora e a secao mostra o loading ate popular, sem
  // travar a tela. true enquanto essa busca em background esta rodando.
  const [nextTripsLoading, setNextTripsLoading] = useState(false);
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

  // Carrega os "Proximos Destinos" em BACKGROUND e faz merge no account atual +
  // cache. A parte lenta (Gemini) fica fora do caminho do login/refresh: a home
  // ja renderiza e a secao mostra o loading ate isto popular. Resiliente - falha
  // aqui nao derruba nada (nextTrips fica como estava).
  const loadNextTrips = useCallback(
    async (accountForCtx: SignInAccountDetails, lang: SupportedLang) => {
      setNextTripsLoading(true);
      try {
        let coords = getCachedLocation();
        if (!coords) coords = await getCurrentLocation();
        const travelerCtx = await travelerContextFor(accountForCtx);
        const nextTrips = await getGeoNextTrips(coords, lang, travelerCtx);
        const current = stateRef.current;
        if (!current.account || !current.token) return;
        const next: SignInAccountDetails = { ...current.account, nextTrips };
        setState({ account: next, token: current.token });
        await saveSession(current.token, next);
      } catch (err) {
        captureHandledError(err, { scope: 'loadNextTrips' });
        console.warn('[auth] nextTrips background load failed:', err);
      } finally {
        setNextTripsLoading(false);
      }
    },
    [],
  );

  const signIn = useCallback(async (login: string, password: string) => {
    setIsSigningIn(true);
    try {
      // Usa a coord cacheada se ja temos. Se ainda nao chegou, tenta
      // fetchar agora (provavelmente vem rapido em rede + GPS quente).
      let coords = getCachedLocation();
      if (!coords) coords = await getCurrentLocation();
      const geolocation = formatLocationPayload(coords);

      if (__DEV__) console.log('[auth] origem do envio → TELA DE LOGIN');
      const response = await apiSignIn(login, password, geolocation);
      if (response.success && response.token && response.accountDetails) {
        // Banners e nextTrips agora vem de endpoints de conteudo dedicados
        // (GetBanners/GetNextTrips), localizados pelo idioma da conta. Falha
        // aqui nao deve barrar o login - caimos no que o payload de SignIn
        // tiver trazido.
        const lang = getUserLanguage(response.accountDetails);
        let { banners } = response.accountDetails;
        try {
          // Banners sao leves (GetBanners) - seguem no caminho do login. Falha
          // aqui nao barra o login: caimos no que o payload trouxe.
          banners = await getBanners(lang);
        } catch (err) {
          captureHandledError(err, { scope: 'signIn.bannersFetch' });
          console.warn('[auth] banners fetch on signIn failed, using payload:', err);
        }
        // nextTrips comeca vazio e carrega em BACKGROUND (parte lenta - Gemini):
        // a home renderiza na hora e a secao mostra o loading ate popular.
        const account: SignInAccountDetails = { ...response.accountDetails, banners, nextTrips: [] };
        setState({ account, token: response.token });
        await saveSession(response.token, account);
        // Guarda as credenciais (cifradas) para permitir re-signin silencioso
        // quando o token expirar - vide refreshSession.
        await saveCredentials(login, password);
        setIsLocked(false);
        loadNextTrips(account, lang);
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
      if (__DEV__) console.log('[auth] origem do envio → REFRESH DE SESSÃO (re-signin silencioso: token expirado ou desbloqueio)');
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
      // Avisa o backend que o usuario voltou a ficar ativo: re-signin silencioso
      // com as credenciais guardadas, enviando geolocation + devInfo atualizados
      // (mesmo payload do login) e renovando o token. Fire-and-forget: nao
      // atrasa o desbloqueio e falha de rede nao trava o app.
      if (__DEV__) console.log('[auth] desbloqueio por biometria → re-signin em background (geolocation + devInfo)');
      refreshSession().catch((err) => {
        console.warn('[auth] re-signin pos-biometria falhou:', err);
      });
      return true;
    }
    console.warn('[auth] unlock failed:', result.error, result.warning);
    return false;
  }, [refreshSession]);

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

    // snapshot + banners seguem no caminho do refresh (leves). O nextTrips
    // (parte lenta - Gemini) carrega em BACKGROUND depois, com o loading na
    // secao: preservamos os nextTrips atuais ate a nova lista popular.
    const [snapshot, banners] = await Promise.all([
      getAccount(accountId, lang),
      getBanners(lang),
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
      nextTrips: current.account.nextTrips,
      account: { ...snapshot.account, countryId: preservedCountryId },
      setups: { ...snapshot.setups, lang: preservedLang },
    };
    setState({ account: next, token: current.token });
    await saveSession(current.token, next);

    // Junto com o resto do conteudo, repopula a FAQ no mesmo idioma. Resiliente
    // (reloadFAQ trata o proprio erro), entao nao compromete o refresh.
    await reloadFAQ(lang);

    // nextTrips em background (no idioma-alvo), com o loading na secao.
    loadNextTrips(next, lang);
  }, [reloadFAQ, loadNextTrips]);

  // Aceite dos termos (gate geral): confirma no backend (ConfirmRead) cada
  // politica ainda nao lida e marca todas como readed=true em memoria + cache,
  // dissolvendo o termsPending. Exige que TODAS as confirmacoes pendentes
  // deem certo - se qualquer uma falhar, propaga o erro para o TermsGate
  // reexibir a mensagem e manter o gate (nao liberamos aceite parcial).
  const acceptPolicies = useCallback(async () => {
    const current = stateRef.current;
    if (!current.account || !current.token) return;
    const accountId = current.account.accountDetails.accountId;
    const polices = current.account.polices ?? [];
    const pending = polices.filter((p) => p.readed !== true);
    if (pending.length > 0) {
      await Promise.all(pending.map((p) => confirmRead(p.contentId, accountId)));
    }
    const next: SignInAccountDetails = {
      ...current.account,
      polices: polices.map((p) => ({ ...p, readed: true })),
    };
    setState({ account: next, token: current.token });
    await saveSession(current.token, next);
  }, []);

  // Pendencia de aceite: alguma politica veio explicitamente com readed=false.
  // readed ausente (cache antigo/payload sem o campo) NAO conta como pendente,
  // para nao gatear indevidamente enquanto o proximo SignIn/refresh nao traz
  // o flag atualizado.
  const termsPending = (state.account?.polices ?? []).some((p) => p.readed === false);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isRestoring,
        isSigningIn,
        isLocked,
        biometricAvailable,
        nextTripsLoading,
        termsPending,
        faq,
        signIn,
        refreshSession,
        signOut,
        unlock,
        lock,
        updateAccountDetails,
        refreshAccount,
        reloadFAQ,
        acceptPolicies,
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
