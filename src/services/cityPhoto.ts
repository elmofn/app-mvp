import { type Place } from './places';

// ----------------------------------------------------------------------------
// Foto da cidade para os cards do NextTrips.
//
// STATUS: sem fonte de foto por enquanto. Todo card usa o GENERICO
// (pickGenericColor) - um fundo colorido deterministico por cidade. A escolha da
// fonte real (Google imagens, Wikimedia, backend proxy, etc.) fica para depois.
//
// getCityPhoto e o ponto de injecao dessa fonte: hoje sempre retorna null (=>
// generico). Quando definirmos a fonte, e so implementar aqui - a fiacao no
// content.ts (timeout curto + busca em paralelo + persistencia da URL no
// nextTrips) ja esta pronta e nao precisa mudar.
// ----------------------------------------------------------------------------

// Ponto de injecao da fonte de foto (a definir). Nunca lanca; null => generico.
export async function getCityPhoto(_place: Place): Promise<string | null> {
  return null;
}

// Fundo do generico: paleta curada (tons de viagem) escolhida de forma
// DETERMINISTICA pelo seed (placeId) - a mesma cidade sempre pega a mesma cor,
// mas cidades diferentes variam. Sem Math.random para ser estavel entre renders.
const GENERIC_COLORS = [
  '#2A9D8F', // teal
  '#264653', // deep blue
  '#E76F51', // terracotta
  '#457B9D', // steel blue
  '#6D597A', // plum
  '#3A5A40', // forest
  '#E9C46A', // sand
  '#7D7BFE', // periwinkle (roxo da marca)
];

export function pickGenericColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return GENERIC_COLORS[Math.abs(hash) % GENERIC_COLORS.length];
}
