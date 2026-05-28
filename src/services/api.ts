export interface User {
  firstName: string;
  balanceBRL: string;
  balanceUSD: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  dateLabel: string; 
  title: string;
  type: string;
  amount: string; 
  value: number;  
  isPositive?: boolean;
}

export interface CuratedTrip {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tag: string;
}

export interface HomeData {
  user: User;
  recentTransactions: Transaction[];
  curatedTrips: CuratedTrip[];
}

export interface StatementData {
  transactions: Transaction[];
  balanceBRL: string;
  balanceUSD: string;
}

// O Banco de Dados centralizado focado em Cashback de Viagem
const RAW_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-10-08', dateLabel: 'RESGATE • 08 OUT', title: 'Passagem para Paris', type: 'Voo Air France', amount: '- R$ 450,00', value: 450.00, isPositive: false },
  { id: '2', date: '2026-10-05', dateLabel: 'CASHBACK • 05 OUT', title: 'Reserva Hotel Hilton', type: 'Hospedagem', amount: '+ R$ 120,50', value: 120.50, isPositive: true },
  { id: '3', date: '2026-09-22', dateLabel: 'RESGATE • 22 SET', title: 'Aluguel de Carro', type: 'Localiza Premium', amount: '- R$ 200,00', value: 200.00, isPositive: false },
  { id: '4', date: '2026-09-10', dateLabel: 'CASHBACK • 10 SET', title: 'Compra Duty Free', type: 'Varejo Viagem', amount: '+ R$ 85,00', value: 85.00, isPositive: true },
  { id: '5', date: '2026-08-15', dateLabel: 'RESGATE • 15 AGO', title: 'Hospedagem Airbnb', type: 'Hospedagem', amount: '- R$ 350,00', value: 350.00, isPositive: false },
  { id: '6', date: '2026-05-12', dateLabel: 'CASHBACK • 12 MAI', title: 'Seguro Viagem', type: 'Serviços', amount: '+ R$ 45,00', value: 45.00, isPositive: true },
  { id: '7', date: '2025-12-18', dateLabel: 'RESGATE • 18 DEZ', title: 'Reserva Copacabana', type: 'Hospedagem', amount: '- R$ 350,00', value: 350.00, isPositive: false },
];

const formatCurrency = (value: number) => {
  return value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

export { formatCurrency };

// Cálculo do saldo: Começa com um bônus de 1500 + cashback - resgates
const calculateCurrentBalance = () => {
  const baseBonus = 1500;
  return RAW_TRANSACTIONS.reduce((acc, tx) => {
    return tx.isPositive ? acc + tx.value : acc - tx.value;
  }, baseBonus);
};

export const fetchHomeData = async (): Promise<HomeData> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const balance = calculateCurrentBalance();

  return {
    user: {
      firstName: 'Elmo',
      balanceBRL: formatCurrency(balance),
      balanceUSD: formatCurrency(balance / 5.15),
    },
    recentTransactions: RAW_TRANSACTIONS.slice(0, 4),
    curatedTrips: [
      {
        id: '1',
        title: 'Alpes Suíços',
        description: 'Descubra a elegância e o minimalismo de Zermatt.',
        imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1000&auto=format&fit=crop',
        tag: 'WINTER',
      },
      {
        id: '2',
        title: 'Tóquio Design',
        description: 'Imersão na arquitetura e cultura da metrópole japonesa.',
        imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
        tag: 'URBAN',
      },
    ],
  };
};

export const fetchStatementData = async (): Promise<StatementData> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const balance = calculateCurrentBalance();

  return {
    transactions: RAW_TRANSACTIONS,
    balanceBRL: formatCurrency(balance),
    balanceUSD: formatCurrency(balance / 5.15),
  };
};