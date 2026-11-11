import type { SupportedLang } from '@/src/services/locale';

// Namespace: welcome — landing screen (Login / Sign Up / Activate Account / Help).
export const welcome: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    login: 'Login',
    signUp: 'Sign Up',
    activateAccount: 'Activate Account',
    help: 'Help',
  },
  'pt-BR': {
    login: 'Entrar',
    signUp: 'Criar Conta',
    activateAccount: 'Ativar Conta',
    help: 'Ajuda',
  },
  'es-ES': {
    login: 'Iniciar Sesión',
    signUp: 'Crear Cuenta',
    activateAccount: 'Activar Cuenta',
    help: 'Ayuda',
  },
};
