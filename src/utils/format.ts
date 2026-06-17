// Formata um numero para o padrao monetario pt-BR: duas casas decimais,
// virgula como separador decimal e ponto como separador de milhar.
// Ex.: 1234.5 -> "1.234,50"
export function formatCurrency(value: number): string {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}
