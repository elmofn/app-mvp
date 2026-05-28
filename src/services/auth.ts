import { Platform } from 'react-native';

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

export type SignInRequest = {
  login: string;
  password: string;
  timeoutInMinutes: number;
  geolocation: string;
  devInfo: string;
};

export type SignInUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  picture: string;
  accountId: string;
  role: string;
  validEmail: boolean;
  validPhoneNumber: boolean;
};

export type SignInBalance = {
  available: number;
  accumulation: number;
  spentPoints: number;
};

export type SignInCurrency = {
  id: string;
  name: string;
  code: string;
  symbol: string;
  currentExchangeRate: number;
};

export type SignInSetups = {
  lang: string;
  defaultCurrencyId: string;
  currency: SignInCurrency;
};

export type SignInAccount = {
  id: string;
  legalId: string;
  status: number;
};

export type SignInAccountDetails = {
  accountDetails: SignInUser;
  account: SignInAccount;
  balance: SignInBalance;
  setups: SignInSetups;
};

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

export async function signIn(login: string, password: string): Promise<SignInResponse> {
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
    geolocation: '',
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
    return JSON.parse(rawBody) as SignInResponse;
  } catch (err) {
    console.warn('[signIn] could not parse 200 body:', rawBody);
    throw new SignInError('Invalid response from server', response.status, rawBody);
  }
}
