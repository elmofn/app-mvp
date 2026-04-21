// Tipagens baseadas no que o seu backend vai entregar
export interface Transaction {
  id: string;
  title: string;
  dateLabel: string;
  amount: string;
}

export interface Trip {
  id: string;
  title: string;
  tag: string;
  description: string;
  imageUrl: string;
}

export interface UserProfile {
  firstName: string;
  balanceBRL: string;
  balanceUSD: string;
}

// O pacote completo que a Home precisa para renderizar
export interface HomeData {
  user: UserProfile;
  recentTransactions: Transaction[];
  curatedTrips: Trip[];
}

// Mock da requisição
export const fetchHomeData = (): Promise<HomeData> => {
  return new Promise((resolve) => {
    // Simulando um delay de 800ms para imitar a latência da internet
    // Isso será essencial para testarmos os visuais de carregamento (Skeletons) mais tarde
    setTimeout(() => {
      resolve({
        user: {
          firstName: 'Elmo',
          balanceBRL: '1.250,00',
          balanceUSD: '244,75',
        },
        recentTransactions: [
          {
            id: 'tx_1',
            title: 'Milan Luxury Suites',
            dateLabel: 'PAGAMENTO FUTURO • 12 OUT',
            amount: '- R$ 420,00',
          },
          {
            id: 'tx_2',
            title: 'Starbucks Airport',
            dateLabel: 'TRANSAÇÃO RECENTE • 10 OUT',
            amount: '- R$ 28,50',
          },
          {
            id: 'tx_3',
            title: 'MME Hoteis',
            dateLabel: 'TRANSAÇÃO RECENTE • 5 OUT',
            amount: '+ R$ 250,50',
          },
        ],
        curatedTrips: [
          {
            id: 'trip_1',
            title: 'Arquipélago das Maldivas',
            tag: 'VERÃO 2026',
            description: 'Experimente a simetria arquitetônica do litoral italiano. Uma jornada curada por Positano e Ravello com foco em geometria e patrimônio.',
            imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop',
          },
          {
            id: 'trip_2',
            title: 'Costa de Cinque Terre',
            tag: 'OUTONO 2026',
            description: 'Um mergulho profundo nas escalas monolíticas de Yosemite. Projetado para o viajante que busca o contraste absoluto de granito e céu.',
            imageUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=800&auto=format&fit=crop&grayscale=true',
          }
        ]
      });
    }, 800); 
  });
};