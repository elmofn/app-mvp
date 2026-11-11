import type { SupportedLang } from '@/src/services/locale';

// Namespace: support — corpo compartilhado da tela de Suporte/Ajuda
// (SupportContent): header, titulo dividido "How Can We Assist You?", cards de
// contato (Whatsapp/Video Call/Travel Assistant) + subtitulos, e botoes
// inferiores (Sobre o app / Termos). Titulos divididos ficam em chaves
// separadas (first/accent/after) para preservar quebras de linha e acento.
export const support: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    // Header
    headerLabel: 'SUPPORT',
    // Split title — "How Can We Assist You?"
    titleFirst: 'How Can\nWe ',
    titleAccent: 'Assist',
    titleAfter: '\nYou?',
    // Split title override — "Need Help?" (used by help.tsx)
    helpTitleFirst: 'Need ',
    helpTitleAccent: 'Help',
    helpTitleAfter: '?',

    // Contact cards
    whatsappTitle: 'Whatsapp',
    whatsappSubtitle: 'Contact Our Support Team',
    videoCallTitle: 'Video Call',
    videoCallSubtitle: 'Lorem Ipsum, Lorem Ipsum.',
    travelAssistantTitle: 'Travel Assistant',
    travelAssistantSubtitle: 'Lorem Ipsum.',

    // FAQ section (static UI only — question/answer content comes from backend)
    faqTitleFirst: 'Frequent',
    faqTitleAccent: 'Questions',
    faqSubtitle: 'KNOWLEDGE BASE',
    faqError: 'Could not load FAQ. Try again later.',
    faqEmpty: 'No FAQ available for your language.',

    // Bottom buttons
    aboutApp: 'About the app',
    termsAndConditions: 'Terms and Conditions',

    // About the app modal (device + version info for support)
    aboutEyebrow: 'ABOUT',
    aboutTitleBase: 'About the',
    aboutTitleAccent: 'app',
    aboutSubtitle: 'Share this information with support if you need help.',
    aboutVersionLabel: 'Version',
    aboutDeviceLabel: 'Device',
    aboutSystemLabel: 'System',
    aboutEnvironmentLabel: 'Environment',
    aboutCopy: 'Copy info',
    aboutCopied: 'Copied!',
  },
  'pt-BR': {
    // Header
    headerLabel: 'SUPORTE',
    // Split title — "Como Podemos Ajudar Você?"
    titleFirst: 'Como Podemos\n',
    titleAccent: 'Ajudar',
    titleAfter: '\nVocê?',
    // Split title override — "Precisa de Ajuda?"
    helpTitleFirst: 'Precisa de ',
    helpTitleAccent: 'Ajuda',
    helpTitleAfter: '?',

    // Contact cards
    whatsappTitle: 'Whatsapp',
    whatsappSubtitle: 'Fale com nosso atendimento',
    videoCallTitle: 'Chamada de Vídeo',
    videoCallSubtitle: 'Lorem Ipsum, Lorem Ipsum.',
    travelAssistantTitle: 'Assistente de Viagem',
    travelAssistantSubtitle: 'Lorem Ipsum.',

    // FAQ section (static UI only — question/answer content comes from backend)
    faqTitleFirst: 'Perguntas',
    faqTitleAccent: 'Frequentes',
    faqSubtitle: 'BASE DE CONHECIMENTO',
    faqError: 'Não foi possível carregar o FAQ. Tente novamente mais tarde.',
    faqEmpty: 'Nenhum FAQ disponível para o seu idioma.',

    // Bottom buttons
    aboutApp: 'Sobre o app',
    termsAndConditions: 'Termos e Condições',

    // About the app modal (device + version info for support)
    aboutEyebrow: 'SOBRE',
    aboutTitleBase: 'Sobre o',
    aboutTitleAccent: 'app',
    aboutSubtitle: 'Compartilhe estas informações com o suporte caso precise de ajuda.',
    aboutVersionLabel: 'Versão',
    aboutDeviceLabel: 'Dispositivo',
    aboutSystemLabel: 'Sistema',
    aboutEnvironmentLabel: 'Ambiente',
    aboutCopy: 'Copiar informações',
    aboutCopied: 'Copiado!',
  },
  'es-ES': {
    // Header
    headerLabel: 'SOPORTE',
    // Split title — "¿Cómo Podemos Ayudarte?"
    titleFirst: '¿Cómo Podemos\n',
    titleAccent: 'Ayudarte',
    titleAfter: '?',
    // Split title override — "¿Necesitas Ayuda?"
    helpTitleFirst: '¿Necesitas ',
    helpTitleAccent: 'Ayuda',
    helpTitleAfter: '?',

    // Contact cards
    whatsappTitle: 'Whatsapp',
    whatsappSubtitle: 'Habla con nuestro equipo de atención',
    videoCallTitle: 'Videollamada',
    videoCallSubtitle: 'Lorem Ipsum, Lorem Ipsum.',
    travelAssistantTitle: 'Asistente de Viaje',
    travelAssistantSubtitle: 'Lorem Ipsum.',

    // FAQ section (static UI only — question/answer content comes from backend)
    faqTitleFirst: 'Preguntas',
    faqTitleAccent: 'Frecuentes',
    faqSubtitle: 'BASE DE CONOCIMIENTO',
    faqError: 'No se pudo cargar el FAQ. Inténtalo de nuevo más tarde.',
    faqEmpty: 'No hay FAQ disponible para tu idioma.',

    // Bottom buttons
    aboutApp: 'Sobre la app',
    termsAndConditions: 'Términos y Condiciones',

    // About the app modal (device + version info for support)
    aboutEyebrow: 'ACERCA DE',
    aboutTitleBase: 'Sobre la',
    aboutTitleAccent: 'app',
    aboutSubtitle: 'Comparte esta información con el soporte si necesitas ayuda.',
    aboutVersionLabel: 'Versión',
    aboutDeviceLabel: 'Dispositivo',
    aboutSystemLabel: 'Sistema',
    aboutEnvironmentLabel: 'Entorno',
    aboutCopy: 'Copiar información',
    aboutCopied: '¡Copiado!',
  },
};
