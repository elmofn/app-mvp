# Prontidão para Produção — TravelBACK (app-mvp)

Auditoria do codebase (Expo SDK 54 / expo-router / RN 0.81 / React 19), consolidada
de 4 frentes: segredos & ambiente, segurança & auth, confiabilidade & erros, higiene
de release. Cada item traz `arquivo:linha` e severidade.

**Leitura geral:** a camada de **funcionalidade/UX está avançada** e o data layer é
mais defensivo que o típico de MVP (todo serviço checa `response.ok`; payloads de
terceiros passam por Zod `safeParse`; `JSON.parse` sempre em try/catch). O que ainda
é **grau protótipo** é a camada de **segurança + configuração de ambiente** — e é
justamente ela que bloqueia um go-live. Não é "90% pronto"; é "feature-completo, não
endurecido para produção".

---

## 🔴 BLOQUEADORES (impedem o go-live)

1. **Segredos embutidos no bundle + assinatura client-side → mover para o backend.**
   - `TRIPEDGE_PARTNER_KEY = 'SANDBOX_...'` hardcoded e exportado — `src/services/places.ts:19` (usado como `Authorization` em `places.ts:124` e `catalog.ts:134`). Extraível de qualquer app publicado.
   - `PARTNER_SSO_SECRET = 'aaaaa'` (placeholder) assinando URLs de SSO via HMAC — `src/services/partnerSso.ts:26,35`. Quem tiver o segredo forja SSO para **qualquer** `account_id` (impersonação). O placeholder também deixa o SSO não-funcional de verdade.
   - `GEMINI_API_KEY` (curadoria dos "Next Trip Ideas") — `src/services/gemini.ts` (via `EXPO_PUBLIC_GEMINI_API_KEY` ou literal). Mesma classe de risco: chave crua chega ao device e é extraível. **Fase 1 (protótipo, ~1 mês)** aceita a chave embarcada COM 4 travas: (a) restringir a chave à *Generative Language API* + package/SHA-1/bundle id no console Google; (b) teto de orçamento + quota; (c) modelo barato (`gemini-2.5-flash`) + cache (~1 chamada/login, persistida em `saveSession`); (d) rotação periódica. Chave vazia ⇒ `rankDestinations` retorna `null` e a home degrada para a seleção geométrica (não quebra).
   - **Ação (todas as chaves):** proxy no backend que guarda as chaves, assina/autentica server-side e expõe endpoints autenticados ao app. Os comentários do próprio código já pedem isso. **Para o Gemini especificamente**, a progressão é: **Fase 2 (antes de escalar) = backend faz PROXY** da chamada (`app → backend → Gemini`), chave nunca toca o device = de fato seguro; no app muda só o corpo de `callGemini` em `gemini.ts` (o resto do fluxo não muda). *Alternativa consciente:* backend manda a chave no payload do signin (melhor que hardcoded, mas ainda extraível por usuário logado). Sem backend próprio, o equivalente seguro é **Firebase AI Logic + App Check** (App Check vira obrigatório para AI Logic em 02/nov/2026).

2. **Backends de staging/dev hardcoded (sem camada de ambiente).**
   - Toda a superfície de auth/conta/financeiro → `https://travelcash-api-stg.azurewebsites.net` (**staging**) em 9 arquivos: `auth.ts:4`, `account.ts:6`, `policies.ts:5`, `content.ts:25`, `marketplace.ts:3`, `alerts.ts:5`, `financial.ts:3`, `faq.ts:5`, `search.ts:8`.
   - Busca de hotéis + SSO → `https://travelback-dev.tripedge.com` (**dev**): `hotelsSearch.ts:19`, `partnerSso.ts:24`.
   - **Não existe mecanismo de config de ambiente**: zero uso de `.env`/`EXPO_PUBLIC_*`/`Constants.expoConfig.extra`; `eas.json` tem perfis mas sem bloco `env`, então todos compilam as mesmas URLs.
   - **Ação:** endpoints reais de produção + camada de ambiente (dev/stg/prod) via `app.config` + EAS env, sem URLs literais em `src/services/*`.

3. **Lock biométrico é ignorado em devices sem biometria cadastrada.**
   - `src/contexts/AuthContext.tsx:98-105` e `src/components/BiometricGate.tsx:54`: `isLocked` só é setado quando `biometricAvailable`. Sem biometria (hardware ausente/nada cadastrado), a sessão restaura e o usuário entra num app **financeiro sem nenhum lock** — não há fallback de PIN/senha. Vale também para o lock ao voltar do background (`AuthContext.tsx:114-117`).
   - **Ação:** fallback obrigatório de PIN/passcode quando não houver biometria.

4. **Token (JWT) + PII completo indo para os logs no SignIn.**
   - `src/services/auth.ts:222` e `:237` logam `rawBody` (JWT + toda a conta) em erro/parse-fail. Credencial em log de device.
   - **Ação:** remover/máscarar antes do release.

---

## 🟠 IMPORTANTE (resolver antes de produção)

5. **Nenhum timeout de rede (sistêmico).** O `fetch` do RN não tem timeout default e nenhum lugar usa `AbortController`. Qualquer dependência lenta/travada vira **spinner infinito**, e isso torna os limites de retry inúteis. Afeta praticamente todos os `src/services/*` (auth, account, content, alerts, faq, financial, marketplace, places, catalog, hotelsSearch). — `HIGH`

6. **WebView do marketplace sem estado de erro/retry.** `app/marketplace.tsx:79-98` só trata `onLoadEnd` (que dispara mesmo em falha) — sem `onError`/`onHttpError`. Se o SSO/TripEdge cair, o usuário fica numa **tela branca sem mensagem nem retry** — e essa é a superfície de compra/booking. — `HIGH`

7. **Assistente de IA responde com texto placeholder.** `app/assistant.tsx:56` + `src/i18n/dict/assistant.ts:29-31` retornam `placeholderReply` fixo ("running on placeholder responses"). Feature inacabada visível ao usuário. — `HIGH`

8. **`react-native-render-html ^6.3.4` — dependência não mantida.** Sem releases há anos, com problemas conhecidos de peer no React 19 / new arch (`newArchEnabled:true`). — `HIGH`

9. **Versão inconsistente:** `app.json expo.version = "0.1"` vs `package.json version = "1.0.0"`. — `HIGH`

10. **Strings não traduzidas (bypass do i18n).** Há sistema i18n (en/pt/es) completo, mas:
    - PT hardcoded: `app/(tabs)/travelshop.tsx:199` ("Hotéis Recomendados").
    - EN hardcoded em tela de auth: `app/login.tsx:457` ("FORGOT PASSWORD"), `:500` ("Save New PIN"), `:471` (`placeholder="0 0 0 0"`).
    - `src/components/CountryPicker.tsx:66` ("Select country").
    — `HIGH`

11. **Armazenamento de credenciais/PII.**
    - Senha **em texto** persistida no SecureStore para re-login silencioso infinito — `src/services/storage.ts:30` (escrita em `AuthContext.tsx:155`). Comprometer o SecureStore = credencial reutilizável.
    - Objeto de conta (nome, email, telefone, legalId, saldo, extratos) no **AsyncStorage (texto plano)** — `storage.ts:26,52`. — `HIGH`

12. **Logs de diagnóstico "remover depois".** `src/services/biometric.ts:40` (loga o resultado do auth), `src/services/catalog.ts:179` (marcado "Diagnostico temporario … remover depois"). Também os nossos `[hotelsSearch]`/`[catalog] proximos` (mantidos a seu pedido por ora). — `HIGH`/`MEDIUM`

---

## 🟡 MÉDIO (resolver logo, idealmente antes)

13. **`refreshAccount` super-acoplado.** `AuthContext.tsx:281` faz `Promise.all([getAccount, getBanners, getGeoNextTrips])` — se `getBanners` falha, o refresh inteiro falha mesmo com a conta OK (pull-to-refresh quebra, alerta em `home.tsx:56`). Deixar a conta cair independente do conteúdo.

14. **Carrossel do Travelshop pode girar pra sempre** se o TripEdge travar (estado nunca sai de `null`) — consequência direta do item 5 (timeouts).

15. **Sem invalidação de sessão server-side no logout.** `signOut` (`AuthContext.tsx:196-200`) só limpa local; com a senha guardada, re-login silencioso em 401 é indefinido (`refreshSession`).

16. **PII em logs de conta.** `src/services/account.ts:106,114,120,247,362` logam `rawBody` (PII / dados adjacentes a código de verificação).

17. **Coordenadas GPS enviadas a terceiro (TripEdge) no boot**, antes de consentimento significativo — `places.ts:107-126`, disparado em `AuthContext.tsx:92` e a cada login/refresh. Rever consentimento/timing.

18. **`IMAGE_SIZE='640x480'` não confirmado** na doc da TripEdge — `catalog.ts:82`.

19. **Cruft de template Expo (shippável).** `app/modal.tsx` (rota `/modal` acessível), `components/EditScreenInfo.tsx`, `components/StyledText.tsx`, `components/ExternalLink.tsx` + `components/__tests__/StyledText-test.js`. Fontes `assets/fonts/*.old` (~700KB).

20. **Mais strings sem i18n:** `app/signup.tsx:793,795` ("POLICIES", "Terms & Conditions"), `src/components/SupportContent.tsx:112` ("Travel Assistant"), prompt biométrico nativo não localizado (`biometric.ts:39`, `cancelLabel:'Cancel'` / `promptMessage` default).

21. **`.gitignore` só ignora `.env*.local`** (`.gitignore:34`) — um `.env`/`.env.production` seria commitado se criado. (`*.key/*.p12/*.pem` já ignorados.)

---

## ⚪ BAIXO / housekeeping

- ~47 `console.warn` tagueados (`[auth]`, `[account]`, …) — bom logging estruturado, mas gate atrás de `__DEV__` para produção.
- `USE_FINGERPRINT` no Android está **deprecado** (substituído por `USE_BIOMETRIC` desde API 28) — `app.json`.
- `slug:"app-mvp"` / `scheme:"appmvp"` genéricos (projeto é TravelBACK) — cosmético, atado ao projeto EAS.
- `js-sha256` só existe para o HMAC do SSO — removível quando o SSO for pro backend.

---

## ✅ O que já está bom (não mexer)

- Tratamento de status HTTP (todo caller checa `response.ok` e lança erro tipado/localizado).
- Validação de payload de terceiros com Zod `safeParse` por item; `JSON.parse` sempre em try/catch — baixo risco de crash por dado externo.
- Degradação graciosa das superfícies de descoberta (places/catalog/hotelsSearch/geoNextTrips caem para vazio/seção escondida).
- Polling da busca de hotéis e paginação do catálogo **bem limitados** (`POLL_MAX_ATTEMPTS`, `MAX_PAGES`).
- Transporte 100% `https://`, sem cert-validation desabilitado.
- Bundle id `com.travelback.app` correto; ícones/splash presentes; telas de login/signup/settings com try/catch + UI de erro densos.

---

## Sequência sugerida

1. **Backend proxy** (itens 1, 2, 11, 17) — é a mudança estrutural maior e destrava a maioria dos bloqueadores de segurança/ambiente.
2. **Lock/PIN fallback** (item 3) e **strip de logs sensíveis** (4, 12, 16) — rápidos e críticos.
3. **Timeouts de rede** (5) + **erro no WebView** (6) — robustez das superfícies principais.
4. **Feature gaps** (7 assistente, 8 dep, 9 versão) e **i18n** (10, 20).
5. **Housekeeping** (19 cruft, 13/14/15 refino, resto).
