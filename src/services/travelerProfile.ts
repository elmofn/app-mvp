import AsyncStorage from '@react-native-async-storage/async-storage';

// ----------------------------------------------------------------------------
// Perfil de Viajante: preferencias que o usuario informa num questionario curto
// para personalizar a curadoria de destinos (vide injecao no prompt do Gemini
// em services/gemini.ts via services/content.ts).
//
// Persistencia: LOCAL por conta (AsyncStorage), chaveado pelo accountId, para
// nao misturar perfis de contas diferentes no mesmo device. Esta camada e
// intencionalmente isolada (load/save/clear) para que a expansao futura para o
// BACKEND seja um swap do corpo dessas funcoes, sem tocar nas telas nem no
// pipeline de conteudo.
// ----------------------------------------------------------------------------

export type TravelStyle = 'beach' | 'city' | 'adventure' | 'culture' | 'gastronomy' | 'nature';
export type TravelCompany = 'solo' | 'couple' | 'family' | 'friends';
export type TravelBudget = 'economy' | 'moderate' | 'premium';
export type TripLength = 'dayTrip' | 'weekend' | 'extended';

export type TravelerProfile = {
  styles: TravelStyle[];
  company?: TravelCompany;
  budget?: TravelBudget;
  tripLength?: TripLength;
  dreamDestination?: string;
  completedAt: string; // ISO
};

export const TRAVEL_STYLES: TravelStyle[] = [
  'beach',
  'city',
  'adventure',
  'culture',
  'gastronomy',
  'nature',
];
export const TRAVEL_COMPANIES: TravelCompany[] = ['solo', 'couple', 'family', 'friends'];
export const TRAVEL_BUDGETS: TravelBudget[] = ['economy', 'moderate', 'premium'];
export const TRIP_LENGTHS: TripLength[] = ['dayTrip', 'weekend', 'extended'];

const KEY_PREFIX = 'travelback.travelerProfile.';
const keyFor = (accountId: string) => `${KEY_PREFIX}${accountId}`;

// Carrega o perfil da conta. Retorna null se nao existe ou se o JSON estiver
// corrompido/fora do shape (defensivo - nunca derruba quem chama).
export async function loadTravelerProfile(accountId: string): Promise<TravelerProfile | null> {
  if (!accountId) return null;
  try {
    const raw = await AsyncStorage.getItem(keyFor(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TravelerProfile>;
    if (!parsed || !Array.isArray(parsed.styles)) return null;
    return {
      styles: parsed.styles.filter((s): s is TravelStyle => TRAVEL_STYLES.includes(s as TravelStyle)),
      company: TRAVEL_COMPANIES.includes(parsed.company as TravelCompany)
        ? (parsed.company as TravelCompany)
        : undefined,
      budget: TRAVEL_BUDGETS.includes(parsed.budget as TravelBudget)
        ? (parsed.budget as TravelBudget)
        : undefined,
      tripLength: TRIP_LENGTHS.includes(parsed.tripLength as TripLength)
        ? (parsed.tripLength as TripLength)
        : undefined,
      dreamDestination:
        typeof parsed.dreamDestination === 'string' ? parsed.dreamDestination : undefined,
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : '',
    };
  } catch (err) {
    console.warn('[travelerProfile] load failed:', err);
    return null;
  }
}

export async function saveTravelerProfile(
  accountId: string,
  profile: TravelerProfile,
): Promise<void> {
  if (!accountId) return;
  try {
    await AsyncStorage.setItem(keyFor(accountId), JSON.stringify(profile));
  } catch (err) {
    console.warn('[travelerProfile] save failed:', err);
  }
}

export async function clearTravelerProfile(accountId: string): Promise<void> {
  if (!accountId) return;
  try {
    await AsyncStorage.removeItem(keyFor(accountId));
  } catch (err) {
    console.warn('[travelerProfile] clear failed:', err);
  }
}

// Monta a dica de preferencias (em INGLES) que vai anexada ao prompt do Gemini.
// Ingles de proposito: e instrucao para o modelo, nao texto de UI - o modelo ja
// recebe, a parte, o idioma em que deve ESCREVER as descricoes. Retorna '' se o
// perfil nao tiver nada util, para o chamador simplesmente nao injetar nada.
const STYLE_HINT: Record<TravelStyle, string> = {
  beach: 'beaches',
  city: 'big cities',
  adventure: 'adventure and outdoor',
  culture: 'culture and history',
  gastronomy: 'food and gastronomy',
  nature: 'nature and landscapes',
};
const COMPANY_HINT: Record<TravelCompany, string> = {
  solo: 'traveling solo',
  couple: 'traveling as a couple',
  family: 'traveling with family',
  friends: 'traveling with friends',
};
const BUDGET_HINT: Record<TravelBudget, string> = {
  economy: 'a budget-friendly budget',
  moderate: 'a moderate budget',
  premium: 'a premium budget',
};
const LENGTH_HINT: Record<TripLength, string> = {
  dayTrip: 'day trips',
  weekend: 'weekend getaways',
  extended: 'longer trips of a week or more',
};

export function formatPreferenceHint(profile: TravelerProfile | null): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.styles.length) {
    parts.push(`prefers ${profile.styles.map((s) => STYLE_HINT[s]).join(', ')}`);
  }
  if (profile.company) parts.push(COMPANY_HINT[profile.company]);
  if (profile.budget) parts.push(`on ${BUDGET_HINT[profile.budget]}`);
  if (profile.tripLength) parts.push(`likes ${LENGTH_HINT[profile.tripLength]}`);
  if (!parts.length && !profile.dreamDestination?.trim()) return '';

  let hint = parts.length ? `The user ${parts.join('; ')}.` : '';
  if (profile.dreamDestination?.trim()) {
    hint += `${hint ? ' ' : ''}Dream destination mentioned: ${profile.dreamDestination.trim()}.`;
  }
  return hint;
}
