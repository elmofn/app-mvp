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
  picture: z.string().optional(),
  accountId: z.string(),
  role: z.string().optional(),
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
  countryId: z.string().optional(),
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
  // Nem todo statement tem unidade associada; o campo so vem quando ha.
  // Todos os consumidores ja usam details?.unitName ?? '—'.
  unitName: z.string().optional(),
  voucherURL: z.string().optional(),
});

export const SignInPolicySchema = z.object({
  contentId: z.string(),
  title: z.string(),
  richText: z.string(),
});

// Banners home e shop agora chegam num unico array, separados pelo campo
// `category` ("Home" | "Shop"). Cada tela filtra a categoria que consome.
export type BannerCategory = 'Home' | 'Shop';

export const SignInBannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  category: z.string(),
  // richtext exibido num modal ao tocar no banner. Opcional para nao descartar
  // banners sem o campo (getBanners filtra itens que falham no safeParse).
  // Aceita as duas grafias caso a API mande camelCase.
  richtext: z.string().optional(),
  richText: z.string().optional(),
});

export const SignInNextTripSchema = z.object({
  id: z.string(),
  title: z.string(),
  tag: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  // place_id da TripEdge, presente so nos trips gerados por geolocalizacao
  // (getGeoNextTrips). Habilita o deep-link do card para /results?place_id=...
  // Ausente nos trips do backend (GetNextTrips) => card nao navega.
  placeId: z.string().optional(),
});

export const SignInStatementSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  originCurrencyId: z.string(),
  originCurrencyCode: z.string(),
  originCurrencySymbol: z.string(),
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
  banners: z.array(SignInBannerSchema),
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
export type SignInBanner = z.infer<typeof SignInBannerSchema>;
export type SignInNextTrip = z.infer<typeof SignInNextTripSchema>;
export type SignInAccountDetails = z.infer<typeof SignInAccountDetailsSchema>;

export type SignInResponse = {
  accountDetails?: SignInAccountDetails;
  token?: string;
  // banners e nextTrips chegam no ROOT do response (irmaos de
  // accountDetails), nao aninhados nele. O signIn move-os para dentro de
  // accountDetails antes de retornar, para que o app acesse via account.
  banners?: SignInBanner[];
  nextTrips?: SignInNextTrip[];
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
    // banners/nextTrips vem no root do response; movemos para dentro de
    // accountDetails para que todo o app (e o cache persistido) os acesse
    // de forma uniforme via account.banners / account.nextTrips.
    if (parsed.accountDetails) {
      parsed.accountDetails.banners = parsed.banners ?? [];
      parsed.accountDetails.nextTrips = parsed.nextTrips ?? [];
    }
    return parsed;
  } catch (err) {
    console.warn('[signIn] could not parse 200 body:', rawBody);
    throw new SignInError('Invalid response from server', response.status, rawBody);
  }
}
