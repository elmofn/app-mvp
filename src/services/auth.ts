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

export async function signIn(login: string, password: string): Promise<SignInResponse> {
  const body: SignInRequest = {
    login,
    password,
    timeoutInMinutes: 0,
    geolocation: '',
    devInfo: `${Platform.OS} ${Platform.Version}`,
  };

  const response = await fetch(`${API_BASE_URL}/api/Security/SignIn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Sign in failed (${response.status})`;
    try {
      const errBody = await response.json();
      message = errBody.errorMessage || errBody.message || message;
    } catch {
      // resposta sem JSON: mantem a mensagem padrao com o status code
    }
    throw new Error(message);
  }

  return response.json();
}
