import type { SupportedLang } from '@/src/services/locale';

// Namespace: travelshop — chrome estatico da tela TravelShop.
export const travelshop: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    headerLabel: 'TRAVELSHOP',
    mainTitle: 'Find Your',
    mainTitleAccent: 'Stay',
    pageDescription:
      'Search hotels, compare deals and book your next trip with TravelBACK cashback.',
    searchButton: 'Search Hotels',
    searchFlightsButton: 'Search Flights',
    marketplaceUnavailable: "Couldn't open the marketplace right now.",
    balanceTitle: 'Balance',
    balanceDesc: 'Manage your Travel Credits.',
    recommendedTitle: 'Hotels',
    recommendedTitleAccent: 'Recommended',
    nearbyTitle: 'Hotels',
    nearbyTitleAccent: 'Nearby',
    reviewCount: '{count} reviews',
    priceCaption: '1 room x 1 night including taxes',
    // Gate: telefone verificado eh pre-requisito para usar o TravelShop.
    verifyPhoneRequiredTitle: 'Verify your phone',
    verifyPhoneRequiredMessage:
      'You need to verify your phone number to use the TravelShop. Verify it now to continue.',
    verifyPhoneRequiredCta: 'Verify phone',
  },
  'pt-BR': {
    headerLabel: 'TRAVELSHOP',
    mainTitle: 'Find Your',
    mainTitleAccent: 'Stay',
    pageDescription:
      'Search hotels, compare deals and book your next trip with TravelBACK cashback.',
    searchButton: 'Buscar Hotéis',
    searchFlightsButton: 'Buscar Passagens Aéreas',
    marketplaceUnavailable: 'Não foi possível abrir o marketplace agora.',
    balanceTitle: 'Balance',
    balanceDesc: 'Gerencie seus Travel Credits.',
    recommendedTitle: 'Hotéis',
    recommendedTitleAccent: 'Recomendados',
    nearbyTitle: 'Hotéis',
    nearbyTitleAccent: 'Próximos',
    reviewCount: '{count} avaliações',
    priceCaption: '1 quarto x 1 noite incluindo impostos',
    // Gate: telefone verificado eh pre-requisito para usar o TravelShop.
    verifyPhoneRequiredTitle: 'Verifique seu telefone',
    verifyPhoneRequiredMessage:
      'Você precisa verificar seu número de telefone para usar o TravelShop. Verifique agora para continuar.',
    verifyPhoneRequiredCta: 'Verificar telefone',
  },
  'es-ES': {
    headerLabel: 'TRAVELSHOP',
    mainTitle: 'Encuentra tu',
    mainTitleAccent: 'Alojamiento',
    pageDescription:
      'Busca hoteles, compara ofertas y reserva tu próximo viaje con el cashback de TravelBACK.',
    searchButton: 'Buscar Hoteles',
    searchFlightsButton: 'Buscar Vuelos',
    marketplaceUnavailable: 'No se pudo abrir el marketplace ahora.',
    balanceTitle: 'Balance',
    balanceDesc: 'Gestiona tus Travel Credits.',
    recommendedTitle: 'Hoteles',
    recommendedTitleAccent: 'Recomendados',
    nearbyTitle: 'Hoteles',
    nearbyTitleAccent: 'Cercanos',
    reviewCount: '{count} reseñas',
    priceCaption: '1 habitación x 1 noche con impuestos incluidos',
    // Gate: telefone verificado eh pre-requisito para usar o TravelShop.
    verifyPhoneRequiredTitle: 'Verifica tu teléfono',
    verifyPhoneRequiredMessage:
      'Necesitas verificar tu número de teléfono para usar el TravelShop. Verifícalo ahora para continuar.',
    verifyPhoneRequiredCta: 'Verificar teléfono',
  },
};
