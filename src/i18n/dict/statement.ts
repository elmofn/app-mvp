import type { SupportedLang } from '@/src/services/locale';

// Namespace: statement — textos da tela de Extrato (app/(tabs)/statement.tsx).
export const statement: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    header: 'STATEMENT',
    titleMain: 'Balance & ',
    titleAccent: 'Statement',
    availableBalance: 'Available Balance',
    emptyTitle: 'No transactions yet',
    emptyText:
      'When you start earning cashback or making redemptions, your activity will show up here.',
    monthsAbbr: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    monthsFull: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },
  'pt-BR': {
    header: 'EXTRATO',
    titleMain: 'Saldo & ',
    titleAccent: 'Extrato',
    availableBalance: 'Saldo Disponível',
    emptyTitle: 'Nenhuma transação ainda',
    emptyText:
      'Quando você começar a ganhar cashback ou fazer resgates, sua atividade aparecerá aqui.',
    monthsAbbr: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
    monthsFull: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ],
  },
  'es-ES': {
    header: 'MOVIMIENTOS',
    titleMain: 'Saldo & ',
    titleAccent: 'Movimientos',
    availableBalance: 'Saldo Disponible',
    emptyTitle: 'Aún no hay transacciones',
    emptyText:
      'Cuando empieces a ganar cashback o a hacer rescates, tu actividad aparecerá aquí.',
    monthsAbbr: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
    monthsFull: [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ],
  },
};
