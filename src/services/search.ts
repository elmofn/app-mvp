// Endpoint GET /api/BMG/search?query=<value>
// O backend faz a query direto no SQL, entao normalizamos o valor antes de
// enviar para encostar exatamente no formato gravado no banco:
// - email: lowercase + trim
// - telefone: somente digitos, incluindo o DDI sem o "+" (ex: 5511999999999)

const API_BASE_URL = 'https://travelcash-api-stg.azurewebsites.net';

async function search(query: string): Promise<unknown[]> {
  const url = `${API_BASE_URL}/api/BMG/search?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*' },
  });

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(dial: string, localNumber: string): string {
  const ddiDigits = dial.replace(/\D/g, '');
  const localDigits = localNumber.replace(/\D/g, '');
  return `${ddiDigits}${localDigits}`;
}

export async function searchByEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
    return false;
  }
  const results = await search(normalized);
  return results.length > 0;
}

export async function searchByPhone(dial: string, localNumber: string): Promise<boolean> {
  const normalized = normalizePhone(dial, localNumber);
  if (normalized.length < 8) {
    return false;
  }
  const results = await search(normalized);
  return results.length > 0;
}
