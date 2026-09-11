// Endpoint GET /api/BMG/search?query=<value>
// O backend faz a query direto no SQL, entao normalizamos o valor antes de
// enviar para encostar exatamente no formato gravado no banco:
// - email: lowercase + trim
// - telefone: somente digitos, incluindo o DDI sem o "+" (ex: 5511999999999)
// - legalId: somente digitos (CPF/CNPJ chegam com mascara em alguns clientes)

import { endpoints } from '@/src/config/env';

const API_BASE_URL = endpoints.travelCashApi;

// Exportado para fluxos que ja conhecem o valor pronto (ex: edit de phone
// no review do activate, onde phoneNumber ja vem normalizado pelo backend).
export async function searchRaw(query: string): Promise<unknown[]> {
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

// Telefone no padrao E.164, com o "+" na frente (ex.: +5511999999999). E o
// formato enviado ao backend nos payloads de criacao/atualizacao de conta: o
// "+" e determinante para a validacao/envio de mensagens (SMS/WhatsApp). Recebe
// um numero ja em digitos completos (DDI + numero) e apenas prefixa o "+".
// (O search de duplicidade continua usando normalizePhone/so-digitos, casando
// com o formato historico gravado no banco.)
export function toE164Phone(phoneDigits: string): string {
  const digits = phoneDigits.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function normalizeLegalId(legalId: string): string {
  return legalId.replace(/\D/g, '');
}

export async function searchByEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
    return false;
  }
  const results = await searchRaw(normalized);
  return results.length > 0;
}

export async function searchByPhone(dial: string, localNumber: string): Promise<boolean> {
  const normalized = normalizePhone(dial, localNumber);
  if (normalized.length < 8) {
    return false;
  }
  const results = await searchRaw(normalized);
  return results.length > 0;
}

export async function searchByLegalId(legalId: string): Promise<boolean> {
  const normalized = normalizeLegalId(legalId);
  if (normalized.length < 5) {
    return false;
  }
  const results = await searchRaw(normalized);
  return results.length > 0;
}

// Search por uma string ja normalizada (caso ediu telefone do activate,
// onde o backend devolveu o numero completo em digitos no GetAccountByCode).
export async function searchByRawDigits(digits: string): Promise<boolean> {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 8) return false;
  const results = await searchRaw(clean);
  return results.length > 0;
}

