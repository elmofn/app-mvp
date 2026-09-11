import type { SupportedLang } from '@/src/services/locale';

// Namespace: assistant — tela do assistente de IA (header estatico, card de
// boas-vindas, prompts sugeridos, resposta placeholder e placeholder do input).
// A marca "TravelBACK IA" e nomes proprios sao mantidos. Mensagens digitadas
// pelo usuario nao passam por aqui.
export const assistant: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    // Header
    headerTitle: 'Travel AI',
    titleBase: 'Your Travel',
    titleAccent: 'Concierge',
    pageDescription: 'Ask anything about destinations, itineraries, or your next reservation.',

    // Welcome card
    badge: 'WELCOME',
    welcomeTitle: 'Hi {name}, what are we planning today?',
    welcomeSubtitle: 'I can help you find hotels, plan routes, and pick the best dates for your trip.',

    // Suggested prompts
    tryAsking: 'TRY ASKING',
    prompts: [
      'Plan a 3-day weekend in Lisbon',
      'What should I pack for Patagonia in winter?',
      'Find me a romantic hotel in Florence',
      'Best time to visit Tokyo',
    ],

    // Canned placeholder reply
    placeholderReply:
      'I can help with that. Booking integration is on the way - for now I am running on placeholder responses.',

    // Input
    inputPlaceholder: 'Ask about places nearby…',
  },
  'pt-BR': {
    // Header
    headerTitle: 'IA de Viagem',
    titleBase: 'Seu Concierge',
    titleAccent: 'de Viagem',
    pageDescription: 'Pergunte qualquer coisa sobre destinos, roteiros ou sua próxima reserva.',

    // Welcome card
    badge: 'BEM-VINDO',
    welcomeTitle: 'Olá {name}, o que vamos planejar hoje?',
    welcomeSubtitle: 'Posso ajudar você a encontrar hotéis, planejar rotas e escolher as melhores datas para sua viagem.',

    // Suggested prompts
    tryAsking: 'EXPERIMENTE PERGUNTAR',
    prompts: [
      'Planeje um fim de semana de 3 dias em Lisboa',
      'O que devo levar para a Patagônia no inverno?',
      'Encontre um hotel romântico em Florença',
      'Melhor época para visitar Tóquio',
    ],

    // Canned placeholder reply
    placeholderReply:
      'Posso ajudar com isso. A integração de reservas está a caminho - por enquanto estou usando respostas de exemplo.',

    // Input
    inputPlaceholder: 'Pergunte sobre locais próximos…',
  },
  'es-ES': {
    // Header
    headerTitle: 'IA de Viaje',
    titleBase: 'Tu Conserje',
    titleAccent: 'de Viaje',
    pageDescription: 'Pregunta lo que quieras sobre destinos, itinerarios o tu próxima reserva.',

    // Welcome card
    badge: 'BIENVENIDO',
    welcomeTitle: 'Hola {name}, ¿qué vamos a planear hoy?',
    welcomeSubtitle: 'Puedo ayudarte a encontrar hoteles, planear rutas y elegir las mejores fechas para tu viaje.',

    // Suggested prompts
    tryAsking: 'PRUEBA A PREGUNTAR',
    prompts: [
      'Planea un fin de semana de 3 días en Lisboa',
      '¿Qué debo llevar a la Patagonia en invierno?',
      'Encuéntrame un hotel romántico en Florencia',
      'Mejor época para visitar Tokio',
    ],

    // Canned placeholder reply
    placeholderReply:
      'Puedo ayudarte con eso. La integración de reservas está en camino - por ahora funciono con respuestas de ejemplo.',

    // Input
    inputPlaceholder: 'Pregunta sobre lugares cercanos…',
  },
};
