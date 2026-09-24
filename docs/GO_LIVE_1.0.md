# Checklist de Go-live 1.0 ("go horse")

> **STATUS: PLANEJAMENTO — nada implementado ainda.**
> Este documento é a checklist acordada para o lançamento 1.0. A implementação dos
> itens da Parte 1 começa quando forem liberados, um a um. Complementa o
> `docs/PRODUCTION_READINESS.md` (auditoria completa); aqui fica só o recorte de
> lançamento.

## Contexto
App feature-complete para um lançamento 1.0 de público **muito pequeno**, com poucos dias de
trabalho restantes. O destino é **produção de verdade**, mas as URLs/credenciais de produção da
TripEdge ainda não existem e serão preenchidas **depois** (perto da submissão). Estratégia:
fechar o **máximo de endurecimento barato** antes de submeter e iterar o resto com o app já
rodando.

O sweep de prontidão mostrou que o app degrada de forma graciosa na maioria dos casos, mas alguns
pontos valem ser fechados antes do launch: vazamento de PII/JWT em logs (→ Sentry), ausência de
timeout de rede (spinner infinito), trava de segurança sem fallback para devices sem biometria,
WebView do marketplace sem estado de erro, e telas placeholder acessíveis.

---

## Parte 1 — Código (implementar sob liberação, item a item)

### A. Mínimo seguro
- [ ] **1. Versão 1.0.0** — `app.json` `expo.version` `"0.1.1"` → `"1.0.0"` (alinha com `package.json`).
      Build number segue via `autoIncrement` do EAS.
- [ ] **2. Parar de vazar PII/JWT em logs (→ Sentry).** O Sentry captura `console.*` como breadcrumbs e o
      `enableLogs: true` (`app/_layout.tsx`) pode encaminhá-los. Guardar atrás de `__DEV__` (ou remover o
      corpo) os logs de body/PII/JWT:
      - `src/services/auth.ts:228,243` (rawBody = JWT + PII no corpo do 200)
      - `src/services/account.ts:106,114,120,247,362` (PII)
      - "diagnósticos temporários": `src/services/biometric.ts:40`, `src/services/catalog.ts:177-179`
      - reavaliar `enableLogs` (manter só se não sobrar PII em log).
- [ ] **3. Estado de erro/retry no WebView do marketplace.** `app/marketplace.tsx` só trata `onLoadEnd`.
      Adicionar `onError`/`onHttpError` → estado de erro com botão "Tentar novamente" (reusar
      `styles.errorWrapper` + `t('travelshop.marketplaceUnavailable')`), evitando tela branca quando o
      TripEdge/SSO falha.
- [ ] **4. Esconder cruft/placeholder acessível.** Remover a rota template `/modal` (`app/modal.tsx` +
      `Stack.Screen name="modal"` em `app/_layout.tsx`) e `components/EditScreenInfo.tsx`. `/assistant` já
      está inacessível (card comentado na home). Telas promocionais (`app/promotional/{1,2,3}.tsx`) só
      são alcançadas por banners `app://promotionalN` → ver Parte 2 (handoff).

### B. Máximo no prazo
- [ ] **5. Timeout de rede sistêmico.** Novo `src/services/http.ts` com `fetchWithTimeout(url, init, ms)`
      usando `AbortController` (default ~15s). Migrar as chamadas `fetch(` dos serviços: `auth.ts`,
      `account.ts`, `content.ts`, `alerts.ts`, `faq.ts`, `financial.ts`, `places.ts`, `catalog.ts`,
      `hotelsSearch.ts`. Cada serviço já trata `!response.ok`/erro, então o timeout vira erro tratado
      (a UI cai no estado de erro/fallback) em vez de spinner infinito. Filtrar `AbortError` do Sentry
      (como já feito em `src/services/gemini.ts`).
- [ ] **6. Fallback de PIN na trava (device sem biometria).** Hoje `isLocked` só ativa quando
      `biometricAvailable` (`src/contexts/AuthContext.tsx:103-105,114-117`) → app financeiro fica **sem
      trava** em device sem biometria.
      - `AuthContext`: travar no boot e no retorno de background sempre que houver sessão + credenciais
        salvas. Novo `unlockWithPin(pin)` comparando o PIN digitado com `loadCredentials().password`
        (`src/services/storage.ts:33` — PIN já cifrado no SecureStore; verificação local/offline). Sem
        credenciais salvas → cair para re-login.
      - `BiometricGate`: com biometria = fluxo atual (prompt nativo); sem biometria (ou via link
        "usar PIN") = teclado de 4 dígitos que chama `unlockWithPin`. Reusar o input de PIN de
        `app/settings.tsx` / `app/activate.tsx`.

---

## Parte 2 — Handoff (antes do build de PRODUÇÃO; não bloqueia o código da Parte 1)
- [ ] **TripEdge de produção** (`src/config/env.ts:44-45`): preencher `tripEdgeSearch` e `tripEdgeSite`
      (hoje vazios de propósito). O guard `env.ts:54-61` avisa no console se ficarem vazios num build de
      produção.
- [ ] **Segredos reais**:
      - `PARTNER_SSO_SECRET` (`src/services/partnerSso.ts:28`, hoje o placeholder `'aaaaa'`)
      - partner key da TripEdge (`src/services/places.ts:20`, hoje `SANDBOX_...`)
      - `GEMINI_API_KEY` (`EXPO_PUBLIC_GEMINI_API_KEY`) restrita + 4 travas; confirmar que o
        `GEMINI_MODEL` (`src/services/gemini.ts:39`, hoje `gemini-3.5-flash-lite`) é um id válido.
- [ ] **EAS**: usar o perfil `production` (`EXPO_PUBLIC_APP_ENV=production`, `autoIncrement`); `submit`
      já tem `ascAppId`/`appleTeamId`; garantir `SENTRY_AUTH_TOKEN` no ambiente de build.
- [ ] **Build nativo fresco** (obrigatório): `expo-network` / `expo-device` / `expo-application` (novos)
      + permissões/plugins só entram recompilando — não funciona por OTA.
- [ ] **Banners de produção**: não publicar banners apontando para `app://promotionalN` (telas
      placeholder).

---

## Parte 3 — Deferido para pós-launch (documentar em PRODUCTION_READINESS)
- [ ] Mover secrets para **backend proxy** (fim do risco de extração/impersonação via SSO) —
      **1º item pós-launch**.
- [ ] Remover `PhoneVerifyModal` morto + cruft template; trocar `react-native-render-html` (não mantida).
- [ ] Desacoplar `refreshAccount` (falha de banner não deve derrubar o refresh); invalidar sessão no
      servidor no logout.
- [ ] i18n das strings restantes; consentimento antes de enviar GPS à TripEdge no boot.

---

## Verificação (ao implementar a Parte 1)
1. `npx tsc --noEmit` limpo (ignorar o erro pré-existente de `components/ExternalLink.tsx`).
2. **Trava/PIN** (device físico): sem biometria cadastrada, abrir o app e voltar de background deve
   travar e exigir o PIN; PIN correto destrava, errado não; com biometria, o fluxo atual segue.
3. **Timeout**: com rede lenta/derrubada, pull-to-refresh e os carrosséis do TravelShop **falham
   rápido** (estado de erro/vazio) em vez de spinner infinito; `AbortError` não vira evento no Sentry.
4. **Marketplace**: com SSO/host indisponível, o WebView mostra erro + "Tentar novamente" (sem tela
   branca).
5. **Logs**: num build release (`preview`/`staging`, `__DEV__=false`), confirmar que nenhum log de
   body/PII/JWT é emitido.
6. **Placeholder**: `/modal` não existe mais; `/assistant` inacessível pela UI.
7. Build **staging** (`eas build --profile staging`) instala e roda; validação ponta-a-ponta do
   marketplace/busca no device.
