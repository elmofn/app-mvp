import type { SupportedLang } from '@/src/services/locale';

// Namespace: notifications — tela de alertas/notificacoes (header estatico,
// estados de loading/erro/vazio, botao "marcar todas como lidas" e rotulos de
// tempo relativo). O conteudo dos alertas em si vem do backend e NAO e
// traduzido aqui. Tambem hospeda as strings do BiometricGate sob `biometric`.
export const notifications: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    // Header
    headerTitle: 'Inbox',
    label: 'NOTIFICATIONS',
    titleBase: 'Your',
    titleAccent: 'Alerts',
    pageDescription: 'Stay up to date with your account activity and TravelBACK updates.',

    // States
    error: 'Could not load alerts. Try again later.',
    empty: "You don't have any alerts right now.",

    // Actions
    markAllAsRead: 'MARK ALL AS READ',

    // Relative time labels
    time: {
      justNow: 'Just now',
      minutesAgo: '{count}m ago',
      hoursAgo: '{count}h ago',
      yesterday: 'Yesterday',
      daysAgo: '{count}d ago',
    },

    // BiometricGate
    biometric: {
      titleBase: 'Welcome',
      titleAccent: 'back',
      subtitle: 'Tap below to unlock your TravelBACK account with biometric authentication.',
      authenticating: 'Authenticating…',
      unlock: 'Unlock',
      signOut: 'Sign out',
    },
  },
  'pt-BR': {
    // Header
    headerTitle: 'Caixa de entrada',
    label: 'NOTIFICAÇÕES',
    titleBase: 'Seus',
    titleAccent: 'Alertas',
    pageDescription: 'Fique por dentro da atividade da sua conta e das novidades TravelBACK.',

    // States
    error: 'Não foi possível carregar os alertas. Tente novamente mais tarde.',
    empty: 'Você não tem nenhum alerta no momento.',

    // Actions
    markAllAsRead: 'MARCAR TODAS COMO LIDAS',

    // Relative time labels
    time: {
      justNow: 'Agora mesmo',
      minutesAgo: 'há {count}m',
      hoursAgo: 'há {count}h',
      yesterday: 'Ontem',
      daysAgo: 'há {count}d',
    },

    // BiometricGate
    biometric: {
      titleBase: 'Bem-vindo de',
      titleAccent: 'volta',
      subtitle: 'Toque abaixo para desbloquear sua conta TravelBACK com autenticação biométrica.',
      authenticating: 'Autenticando…',
      unlock: 'Desbloquear',
      signOut: 'Sair',
    },
  },
  'es-ES': {
    // Header
    headerTitle: 'Bandeja de entrada',
    label: 'NOTIFICACIONES',
    titleBase: 'Tus',
    titleAccent: 'Alertas',
    pageDescription: 'Mantente al día con la actividad de tu cuenta y las novedades TravelBACK.',

    // States
    error: 'No se pudieron cargar las alertas. Inténtalo de nuevo más tarde.',
    empty: 'No tienes ninguna alerta en este momento.',

    // Actions
    markAllAsRead: 'MARCAR TODAS COMO LEÍDAS',

    // Relative time labels
    time: {
      justNow: 'Ahora mismo',
      minutesAgo: 'hace {count}m',
      hoursAgo: 'hace {count}h',
      yesterday: 'Ayer',
      daysAgo: 'hace {count}d',
    },

    // BiometricGate
    biometric: {
      titleBase: 'Bienvenido de',
      titleAccent: 'nuevo',
      subtitle: 'Toca abajo para desbloquear tu cuenta TravelBACK con autenticación biométrica.',
      authenticating: 'Autenticando…',
      unlock: 'Desbloquear',
      signOut: 'Cerrar sesión',
    },
  },
};
