import type { SupportedLang } from './locale';

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

// O backend gera o accountId real - o que mandamos no CreateAccount eh
// um placeholder fixo (vide spec do endpoint). Nunca persistir este id.
const PLACEHOLDER_ACCOUNT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

type LocalizedPayload = {
  message?: string;
  messageIng?: string;
  messageEsp?: string;
};

// Escolhe a string correta entre os 3 campos localizados que o backend
// devolve. Cai no campo disponivel quando o idioma desejado nao chegou.
function pickLocalizedMessage(payload: LocalizedPayload, lang: SupportedLang): string {
  if (lang === 'en-US' && payload.messageIng) return payload.messageIng;
  if (lang === 'es-ES' && payload.messageEsp) return payload.messageEsp;
  if (lang === 'pt-BR' && payload.message) return payload.message;
  return payload.messageIng || payload.message || payload.messageEsp || '';
}

// Erro especifico do ValidateCode com 400 - o signup trata diferente
// (mensagem inline) versus erros de rede genericos.
export class ValidateCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidateCodeError';
  }
}

async function parseLocalizedError(
  response: Response,
  lang: SupportedLang,
  fallback: string,
): Promise<string> {
  const raw = await response.text();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as LocalizedPayload;
    return pickLocalizedMessage(parsed, lang) || fallback;
  } catch {
    return raw.slice(0, 300);
  }
}

// ----------------------------------------------------------------------------
// CreateAccount: PUT /api/Account/CreateAccount
// O backend ignora o accountId enviado e gera um novo - lemos o id da
// resposta em account.id e usamos nas chamadas subsequentes.
// ----------------------------------------------------------------------------

export type CreateAccountInput = {
  name: string;
  email: string;
  phoneNumber: string; // formato normalizado, ex.: '5511999999999'
  language: SupportedLang;
  geolocation: string; // JSON string ou ''
};

export async function createAccount(
  input: CreateAccountInput,
  lang: SupportedLang,
): Promise<{ accountId: string }> {
  const url = `${API_BASE_URL}/api/Account/CreateAccount`;
  const body = {
    accountId: PLACEHOLDER_ACCOUNT_ID,
    name: input.name,
    email: input.email,
    legalId: '',
    phoneNumber: input.phoneNumber,
    language: input.language,
    geolocation: input.geolocation,
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let message = `CreateAccount failed (${response.status})`;
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        message =
          parsed.errorMessage ||
          pickLocalizedMessage(parsed, lang) ||
          parsed.message ||
          parsed.title ||
          rawBody.slice(0, 300);
      } catch {
        message = rawBody.slice(0, 300);
      }
    }
    console.warn('[account] CreateAccount HTTP', response.status, 'body:', rawBody);
    throw new Error(message);
  }

  try {
    const parsed = JSON.parse(rawBody);
    const accountId: string | undefined = parsed?.account?.id;
    if (!accountId) {
      console.warn('[account] CreateAccount missing account.id:', rawBody);
      throw new Error('Account creation succeeded but no accountId was returned.');
    }
    return { accountId };
  } catch (err) {
    if (err instanceof Error && err.message.includes('accountId')) throw err;
    console.warn('[account] CreateAccount could not parse body:', rawBody);
    throw new Error('Invalid response from server.');
  }
}

// ----------------------------------------------------------------------------
// RequestValidationCode: POST /api/Account/RequestValidationCode?accountId=...
// O body eh o numero 0 (email) ou 1 (telefone) serializado como JSON.
// ----------------------------------------------------------------------------

export type ValidationTarget = 'email' | 'phone';

export async function requestValidationCode(
  accountId: string,
  target: ValidationTarget,
  lang: SupportedLang,
): Promise<void> {
  const url =
    `${API_BASE_URL}/api/Account/RequestValidationCode?accountId=${encodeURIComponent(accountId)}`;
  const bodyValue = target === 'email' ? 0 : 1;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(bodyValue),
  });

  if (!response.ok) {
    const message = await parseLocalizedError(
      response,
      lang,
      `RequestValidationCode failed (${response.status})`,
    );
    console.warn('[account] RequestValidationCode HTTP', response.status);
    throw new Error(message);
  }
}

// ----------------------------------------------------------------------------
// GetAccountByCode: GET /api/Account/GetAccountByCode?code={code}
// Verifica o codigo de ativacao e devolve um preview da conta (name,
// email, phone, polices). Diferente do ValidateCode, codigo invalido
// vem em 200 com result=false (nao em 400) - tratamos isso como
// ActivationCodeError pra UI exibir mensagem inline.
// ----------------------------------------------------------------------------

export class ActivationCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivationCodeError';
  }
}

export type AccountPreviewPolice = {
  contentId: string;
  title: string;
  richText: string;
};

export type AccountPreview = {
  accountId: string;
  name: string;
  email: string;
  phoneNumber: string;
  legalId: string;
  language: SupportedLang;
  currencyId: string;
  countryId: string;
  polices: AccountPreviewPolice[];
};

export async function getAccountByCode(
  code: string,
  lang: SupportedLang,
): Promise<AccountPreview> {
  const url = `${API_BASE_URL}/api/Account/GetAccountByCode?code=${encodeURIComponent(code)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let message = `GetAccountByCode failed (${response.status})`;
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as LocalizedPayload;
        message = pickLocalizedMessage(parsed, lang) || message;
      } catch {
        message = rawBody.slice(0, 300);
      }
    }
    console.warn('[account] GetAccountByCode HTTP', response.status);
    throw new Error(message);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid response from server.');
  }

  if (parsed?.result === false) {
    const message = pickLocalizedMessage(parsed as LocalizedPayload, lang)
      || 'Invalid or expired activation code.';
    throw new ActivationCodeError(message);
  }

  const accountDetails = (parsed.accountDetails ?? {}) as Record<string, unknown>;
  const account = (parsed.account ?? {}) as Record<string, unknown>;
  const setups = (parsed.setups ?? {}) as Record<string, unknown>;
  const policesRaw = Array.isArray(parsed.polices) ? (parsed.polices as Record<string, unknown>[]) : [];

  const rawLang = typeof setups.lang === 'string' ? setups.lang : '';
  const language: SupportedLang =
    rawLang === 'pt-BR' || rawLang === 'es-ES' || rawLang === 'en-US' ? rawLang : lang;

  const accountId = typeof accountDetails.accountId === 'string' ? accountDetails.accountId : '';
  if (!accountId) {
    console.warn('[account] GetAccountByCode missing accountId:', rawBody.slice(0, 300));
    throw new Error('Invalid response from server.');
  }

  const polices: AccountPreviewPolice[] = [];
  for (const p of policesRaw) {
    const contentId = typeof p.contentId === 'string' ? p.contentId : '';
    const title = typeof p.title === 'string' ? p.title : '';
    const richText = typeof p.richText === 'string' ? p.richText : '';
    if (contentId) polices.push({ contentId, title, richText });
  }

  const currencyId =
    typeof setups.defaultCurrencyId === 'string' ? setups.defaultCurrencyId : '';
  const accountCountryId = typeof account.countryId === 'string' ? account.countryId : '';
  const setupsCountryId =
    typeof setups.defaultCountryId === 'string' ? setups.defaultCountryId : '';
  const countryId = accountCountryId || setupsCountryId;

  return {
    accountId,
    name: typeof accountDetails.name === 'string' ? accountDetails.name : '',
    email: typeof accountDetails.email === 'string' ? accountDetails.email : '',
    phoneNumber:
      typeof accountDetails.phoneNumber === 'string' ? accountDetails.phoneNumber : '',
    legalId: typeof account.legalId === 'string' ? account.legalId : '',
    language,
    currencyId,
    countryId,
    polices,
  };
}

// ----------------------------------------------------------------------------
// ValidateCode: POST /api/Account/ValidateCode
// 400 -> codigo invalido/expirado, vira ValidateCodeError com msg localizada.
// 200 -> { accountId, message, messageIng, messageEsp }
// ----------------------------------------------------------------------------

export async function validateCode(
  identifier: string,
  code: string,
  lang: SupportedLang,
): Promise<{ accountId: string }> {
  const url = `${API_BASE_URL}/api/Account/ValidateCode`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ identifier, code }),
  });

  const rawBody = await response.text();

  if (response.status === 400) {
    let message = 'Invalid or expired code.';
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as LocalizedPayload;
        message = pickLocalizedMessage(parsed, lang) || message;
      } catch {
        // segue com fallback
      }
    }
    throw new ValidateCodeError(message);
  }

  if (!response.ok) {
    console.warn('[account] ValidateCode HTTP', response.status, 'body:', rawBody);
    throw new Error(`ValidateCode failed (${response.status})`);
  }

  try {
    const parsed = JSON.parse(rawBody);
    const accountId: string | undefined = parsed?.accountId;
    if (!accountId) {
      throw new Error('ValidateCode succeeded but no accountId was returned.');
    }
    return { accountId };
  } catch (err) {
    if (err instanceof Error && err.message.includes('accountId')) throw err;
    throw new Error('Invalid response from server.');
  }
}

// ----------------------------------------------------------------------------
// APPUpdateAccount: PUT /api/Account/APPUpdateAccount
// Atualiza name/email/phoneNumber + currencyId/countryId de uma conta
// existente numa unica chamada (cobre profile + moeda + pais default).
// Mudancas em email ou phoneNumber sao gateadas pelo fluxo de verificacao
// chamado a partir da tela de settings - este metodo soh dispara a PUT.
// ----------------------------------------------------------------------------

export type UpdateAccountInput = {
  accountId: string;
  name: string;
  email: string;
  phoneNumber: string;
  currencyId: string;
  countryId: string;
  geolocation?: string;
};

export async function updateAccount(
  input: UpdateAccountInput,
  lang: SupportedLang,
): Promise<void> {
  const url = `${API_BASE_URL}/api/Account/APPUpdateAccount`;
  const body: Record<string, string> = {
    accountId: input.accountId,
    name: input.name,
    email: input.email,
    phoneNumber: input.phoneNumber,
    currencyId: input.currencyId,
    countryId: input.countryId,
  };
  if (input.geolocation) body.geolocation = input.geolocation;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await parseLocalizedError(
      response,
      lang,
      `APPUpdateAccount failed (${response.status})`,
    );
    console.warn('[account] APPUpdateAccount HTTP', response.status);
    throw new Error(message);
  }
}

// ----------------------------------------------------------------------------
// RemoveAccount: POST /api/Account/RemoveAccount
// Deleta a conta do usuario. Se blockAccount=true, o backend tambem
// marca o e-mail como bloqueado, impedindo que ele seja reativado pelo
// pipeline que cria contas inativas automaticamente a partir de dados
// processados.
// ----------------------------------------------------------------------------

export async function removeAccount(
  accountId: string,
  blockAccount: boolean,
  lang: SupportedLang,
): Promise<void> {
  const url = `${API_BASE_URL}/api/Account/RemoveAccount`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ accountId, blockAccount }),
  });

  if (!response.ok) {
    const message = await parseLocalizedError(
      response,
      lang,
      `RemoveAccount failed (${response.status})`,
    );
    console.warn('[account] RemoveAccount HTTP', response.status);
    throw new Error(message);
  }
}

// ----------------------------------------------------------------------------
// SendPasswordRecoveryToken: POST /api/Security/SendPasswordRecoveryToken
// Inicia o fluxo de "esqueci minha senha" - o backend dispara um codigo
// para o e-mail informado. A validacao do codigo segue pelo ValidateCode
// padrao (identifier = email) e a troca da senha pelo SetNewPassword.
// ----------------------------------------------------------------------------

export async function sendPasswordRecoveryToken(
  email: string,
  lang: SupportedLang,
): Promise<void> {
  const url = `${API_BASE_URL}/api/Security/SendPasswordRecoveryToken`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const message = await parseLocalizedError(
      response,
      lang,
      `SendPasswordRecoveryToken failed (${response.status})`,
    );
    console.warn('[account] SendPasswordRecoveryToken HTTP', response.status);
    throw new Error(message);
  }
}

// Mapeia o idioma do app para o UUID de pais usado pelo backend em
// APPUpdateAccount. Estes ids sao constantes do dominio do backend -
// trate como enums, nao como dados.
export const LANGUAGE_COUNTRY_IDS: Record<SupportedLang, string> = {
  'en-US': '71a5e1a1-18eb-4e4a-9b7f-11c5bf8c4bb0',
  'es-ES': 'f4b3db4d-68d2-42a6-be2e-4d3bbe9fabb3',
  'pt-BR': '69518c70-d652-4408-9c69-c2858c83264c',
};

// ----------------------------------------------------------------------------
// SetNewPasswordAccount: POST /api/Account/SetNewPasswordAccount
// ----------------------------------------------------------------------------

export async function setNewPassword(
  accountId: string,
  password: string,
  lang: SupportedLang,
): Promise<void> {
  const url = `${API_BASE_URL}/api/Account/SetNewPasswordAccount`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ accountId, password }),
  });

  if (!response.ok) {
    const message = await parseLocalizedError(
      response,
      lang,
      `SetNewPassword failed (${response.status})`,
    );
    console.warn('[account] SetNewPassword HTTP', response.status);
    throw new Error(message);
  }
}
