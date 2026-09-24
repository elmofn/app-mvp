import type { SupportedLang } from '@/src/services/locale';

// Namespace: termsGate — gate geral de aceite dos Termos & Condicoes exibido
// quando a conta logada tem alguma politica pendente (readed=false): usuarios
// migrados de base antiga ou termos atualizados. O conteudo das politicas em
// si vem do backend (account.polices) ja localizado; aqui fica so o "chrome".
export const termsGate: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    eyebrow: 'BEFORE YOU CONTINUE',
    titleFirst: 'Terms & ',
    titleAccent: 'Conditions',
    description:
      'Our terms have been updated. Please review and accept them to keep using TravelBACK.',
    accept: 'I have read and accept the Terms & Conditions and the Privacy Policy.',
    acceptButton: 'Accept and continue',
    empty: 'No policies available for your account at this moment.',
    error: 'We could not record your acceptance. Please try again.',
  },
  'pt-BR': {
    eyebrow: 'ANTES DE CONTINUAR',
    titleFirst: 'Termos & ',
    titleAccent: 'Condições',
    description:
      'Nossos termos foram atualizados. Leia e aceite para continuar usando o TravelBACK.',
    accept: 'Li e aceito os Termos & Condições e a Política de Privacidade.',
    acceptButton: 'Aceitar e continuar',
    empty: 'Nenhuma política disponível para a sua conta no momento.',
    error: 'Não foi possível registrar seu aceite. Tente novamente.',
  },
  'es-ES': {
    eyebrow: 'ANTES DE CONTINUAR',
    titleFirst: 'Términos & ',
    titleAccent: 'Condiciones',
    description:
      'Nuestros términos se han actualizado. Léelos y acéptalos para seguir usando TravelBACK.',
    accept: 'He leído y acepto los Términos & Condiciones y la Política de Privacidad.',
    acceptButton: 'Aceptar y continuar',
    empty: 'No hay políticas disponibles para tu cuenta en este momento.',
    error: 'No se pudo registrar tu aceptación. Inténtalo de nuevo.',
  },
};
