import { Platform } from 'react-native';
import { z } from 'zod';

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

export type SignInRequest = {
  login: string;
  password: string;
  timeoutInMinutes: number;
  geolocation: string;
  devInfo: string;
};

// ----------------------------------------------------------------------------
// Schemas Zod do payload de SignIn.
// Sao a unica fonte da verdade do shape esperado: o storage roda safeParse
// contra o cache, e os tipos TypeScript abaixo vem de z.infer<typeof Schema>.
// Quando voce comecar a ler um campo novo no app, adicione ele aqui (assim
// caches antigos sem esse campo sao invalidados automaticamente).
// ----------------------------------------------------------------------------

export const SignInUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  picture: z.string(),
  accountId: z.string(),
  role: z.string(),
  validEmail: z.boolean(),
  validPhoneNumber: z.boolean(),
});

export const SignInBalanceSchema = z.object({
  available: z.number(),
  accumulation: z.number(),
  spentPoints: z.number(),
});

export const SignInCurrencySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  symbol: z.string(),
  currentExchangeRate: z.number(),
});

export const SignInSetupsSchema = z.object({
  lang: z.string(),
  defaultCurrencyId: z.string(),
  currency: SignInCurrencySchema,
});

export const SignInAccountSchema = z.object({
  id: z.string(),
  legalId: z.string(),
  status: z.number(),
});

export const SignInStatementDetailsSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  productId: z.number(),
  complement: z.string(),
  internalCode: z.string(),
  locatorCode: z.string(),
  saleValue: z.number(),
  purchaseValue: z.number(),
  cashBackPercente: z.number(),
  marginPercent: z.number(),
  marginCashback: z.number(),
  marginValue: z.number(),
  idclientUnit: z.number().optional(),
  productName: z.string(),
  unitName: z.string(),
  voucherURL: z.string().optional(),
});

export const SignInPolicySchema = z.object({
  contentId: z.string(),
  title: z.string(),
  richText: z.string(),
});

export const SignInHomeBannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
});

export const SignInNextTripSchema = z.object({
  id: z.string(),
  title: z.string(),
  tag: z.string(),
  description: z.string(),
  imageUrl: z.string(),
});

export const SignInStatementSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  originCurrencyId: z.string(),
  title: z.string(),
  type: z.number(),
  value: z.number(),
  creationTime: z.string(),
  updateTime: z.string().optional(),
  exchangeRate: z.number(),
  originValue: z.number(),
  status: z.number(),
  details: SignInStatementDetailsSchema,
});

export const SignInAccountDetailsSchema = z.object({
  accountDetails: SignInUserSchema,
  account: SignInAccountSchema,
  balance: SignInBalanceSchema,
  setups: SignInSetupsSchema,
  statements: z.array(SignInStatementSchema).optional(),
  polices: z.array(SignInPolicySchema),
  homeBanners: z.array(SignInHomeBannerSchema),
  nextTrips: z.array(SignInNextTripSchema),
});

export type SignInUser = z.infer<typeof SignInUserSchema>;
export type SignInBalance = z.infer<typeof SignInBalanceSchema>;
export type SignInCurrency = z.infer<typeof SignInCurrencySchema>;
export type SignInSetups = z.infer<typeof SignInSetupsSchema>;
export type SignInAccount = z.infer<typeof SignInAccountSchema>;
export type SignInStatementDetails = z.infer<typeof SignInStatementDetailsSchema>;
export type SignInStatement = z.infer<typeof SignInStatementSchema>;
export type SignInPolicy = z.infer<typeof SignInPolicySchema>;
export type SignInHomeBanner = z.infer<typeof SignInHomeBannerSchema>;
export type SignInNextTrip = z.infer<typeof SignInNextTripSchema>;
export type SignInAccountDetails = z.infer<typeof SignInAccountDetailsSchema>;

export type SignInResponse = {
  accountDetails?: SignInAccountDetails;
  token?: string;
  result: boolean;
  message: string;
  status: number;
  success: boolean;
  errorMessage: string;
};

export class SignInError extends Error {
  status: number;
  body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'SignInError';
    this.status = status;
    this.body = body;
  }
}

export async function signIn(
  login: string,
  password: string,
  geolocation = '',
): Promise<SignInResponse> {
  // devInfo eh declarado como string no contrato, mas o controller faz
  // JsonConvert.DeserializeObject internamente, entao o conteudo precisa
  // ser um JSON serializado (objeto com dados do device).
  const devInfo = JSON.stringify({
    os: Platform.OS,
    version: String(Platform.Version),
  });

  const body: SignInRequest = {
    login,
    password,
    timeoutInMinutes: 0,
    geolocation,
    devInfo,
  };

  const url = `${API_BASE_URL}/api/Security/SignIn`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let message = `Sign in failed (${response.status})`;
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        message = parsed.errorMessage || parsed.message || parsed.title || rawBody.slice(0, 300);
      } catch {
        message = rawBody.slice(0, 300);
      }
    }
    console.warn('[signIn] HTTP', response.status, 'body:', rawBody);
    throw new SignInError(message, response.status, rawBody);
  }

  try {
    const parsed = JSON.parse(rawBody) as SignInResponse;
    // DEBUG temporario: confirma onde o backend coloca homeBanners/nextTrips
    console.log('[signIn] response keys:', Object.keys(parsed));
    console.log('[signIn] accountDetails keys:', parsed.accountDetails ? Object.keys(parsed.accountDetails) : '(none)');
    console.log(
      '[signIn] homeBanners len:',
      Array.isArray(parsed.accountDetails?.homeBanners)
        ? parsed.accountDetails?.homeBanners.length
        : '(missing)',
      'nextTrips len:',
      Array.isArray(parsed.accountDetails?.nextTrips)
        ? parsed.accountDetails?.nextTrips.length
        : '(missing)',
    );
    return parsed;
  } catch (err) {
    console.warn('[signIn] could not parse 200 body:', rawBody);
    throw new SignInError('Invalid response from server', response.status, rawBody);
  }
}
