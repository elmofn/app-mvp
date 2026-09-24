import type { SupportedLang } from '@/src/services/locale';

// Namespace: terms — tela de Termos & Condicoes (terms.tsx). Apenas o "chrome"
// estatico: header, titulo dividido, intro e estado vazio. O conteudo das
// politicas em si vem do backend (account.polices) ja localizado.
export const terms: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    screenHeaderTitle: 'Legal',
    headerLabel: 'POLICIES',
    // Split title — "Terms & Conditions"
    titleFirst: 'Terms & ',
    titleAccent: 'Conditions',
    pageDescription: 'Policies that apply to your TravelBACK account.',
    empty: 'No policies available for your account at this moment.',
  },
  'pt-BR': {
    screenHeaderTitle: 'Legal',
    headerLabel: 'POLÍTICAS',
    // Split title — "Termos & Condições"
    titleFirst: 'Termos & ',
    titleAccent: 'Condições',
    pageDescription: 'Políticas que se aplicam à sua conta TravelBACK.',
    empty: 'Nenhuma política disponível para a sua conta no momento.',
  },
  'es-ES': {
    screenHeaderTitle: 'Legal',
    headerLabel: 'POLÍTICAS',
    // Split title — "Términos & Condiciones"
    titleFirst: 'Términos & ',
    titleAccent: 'Condiciones',
    pageDescription: 'Políticas que se aplican a tu cuenta TravelBACK.',
    empty: 'No hay políticas disponibles para tu cuenta en este momento.',
  },
};
