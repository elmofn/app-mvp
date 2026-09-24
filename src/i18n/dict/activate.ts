import type { SupportedLang } from '@/src/services/locale';

// Namespace: activate — textos da tela de ativacao (app/activate.tsx).
// `steps` e um array na MESMA ordem do STEPS local (id/key ficam no
// componente). Os demais textos cobrem header, review, termos, CTA e
// mensagens de alerta/erro.
export const activate: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    headerTitle: 'Activate Account',
    steps: [
      {
        titleFirst: 'Activation',
        titleAccent: 'Code',
        description: 'Enter the activation code you received to confirm your TravelBACK account.',
        label: 'Activation Code',
        placeholder: 'Your activation code',
      },
      {
        titleFirst: 'Create',
        titleAccent: 'Password',
        description: 'Set a 4-digit PIN to protect your TravelBACK account.',
        label: 'Password',
        placeholder: '0 0 0 0',
      },
      {
        titleFirst: 'Review',
        titleAccent: 'Details',
        description: 'Check your account details and accept the terms to finish the activation.',
        label: 'Account Summary',
        placeholder: '',
      },
    ],
    review: {
      name: 'Name',
      email: 'E-mail',
      phone: 'Phone',
      legalId: 'Legal ID',
      tapToEdit: '{label} • tap to edit',
      empty: '—',
    },
    terms: {
      accept: 'I accept the ',
      termsLink: 'Terms and Conditions',
      and: ' and the ',
      privacyLink: 'Privacy Policy',
      end: '.',
    },
    cta: {
      next: 'Next',
      finish: 'Finish Activation',
    },
    edit: {
      name: 'Name',
      phone: 'Phone',
    },
    termsModal: {
      eyebrow: 'POLICIES',
      titleFirst: 'Terms & ',
      titleAccent: 'Conditions',
      empty: 'Terms not available.',
    },
    errors: {
      enterCode: 'Enter your activation code.',
      usePin: 'Use a 4-digit PIN.',
      savePassword: 'Could not save your password.',
      validateCode: 'Could not validate the code.',
      finish: 'Could not finish the activation.',
    },
    alerts: {
      activationTitle: 'Activation',
      termsTitle: 'Terms',
      termsMessage: 'Please accept the Terms and Conditions to continue.',
      activatedTitle: 'Activated',
      signInFailed: 'Your account was activated but sign in failed. Please log in manually.',
    },
  },
  'pt-BR': {
    headerTitle: 'Ativar Conta',
    steps: [
      {
        titleFirst: 'Código de',
        titleAccent: 'Ativação',
        description: 'Digite o código de ativação que você recebeu para confirmar sua conta TravelBACK.',
        label: 'Código de Ativação',
        placeholder: 'Seu código de ativação',
      },
      {
        titleFirst: 'Criar',
        titleAccent: 'Senha',
        description: 'Defina um PIN de 4 dígitos para proteger sua conta TravelBACK.',
        label: 'Senha',
        placeholder: '0 0 0 0',
      },
      {
        titleFirst: 'Revisar',
        titleAccent: 'Detalhes',
        description: 'Confira os detalhes da sua conta e aceite os termos para concluir a ativação.',
        label: 'Resumo da Conta',
        placeholder: '',
      },
    ],
    review: {
      name: 'Nome',
      email: 'E-mail',
      phone: 'Telefone',
      legalId: 'Documento',
      tapToEdit: '{label} • toque para editar',
      empty: '—',
    },
    terms: {
      accept: 'Eu aceito os ',
      termsLink: 'Termos e Condições',
      and: ' e a ',
      privacyLink: 'Política de Privacidade',
      end: '.',
    },
    cta: {
      next: 'Próximo',
      finish: 'Concluir Ativação',
    },
    edit: {
      name: 'Nome',
      phone: 'Telefone',
    },
    termsModal: {
      eyebrow: 'POLÍTICAS',
      titleFirst: 'Termos e ',
      titleAccent: 'Condições',
      empty: 'Termos não disponíveis.',
    },
    errors: {
      enterCode: 'Digite seu código de ativação.',
      usePin: 'Use um PIN de 4 dígitos.',
      savePassword: 'Não foi possível salvar sua senha.',
      validateCode: 'Não foi possível validar o código.',
      finish: 'Não foi possível concluir a ativação.',
    },
    alerts: {
      activationTitle: 'Ativação',
      termsTitle: 'Termos',
      termsMessage: 'Aceite os Termos e Condições para continuar.',
      activatedTitle: 'Ativada',
      signInFailed: 'Sua conta foi ativada, mas o login falhou. Faça login manualmente.',
    },
  },
  'es-ES': {
    headerTitle: 'Activar Cuenta',
    steps: [
      {
        titleFirst: 'Código de',
        titleAccent: 'Activación',
        description: 'Introduce el código de activación que recibiste para confirmar tu cuenta TravelBACK.',
        label: 'Código de Activación',
        placeholder: 'Tu código de activación',
      },
      {
        titleFirst: 'Crear',
        titleAccent: 'Contraseña',
        description: 'Establece un PIN de 4 dígitos para proteger tu cuenta TravelBACK.',
        label: 'Contraseña',
        placeholder: '0 0 0 0',
      },
      {
        titleFirst: 'Revisar',
        titleAccent: 'Detalles',
        description: 'Revisa los detalles de tu cuenta y acepta los términos para finalizar la activación.',
        label: 'Resumen de la Cuenta',
        placeholder: '',
      },
    ],
    review: {
      name: 'Nombre',
      email: 'E-mail',
      phone: 'Teléfono',
      legalId: 'Documento',
      tapToEdit: '{label} • toca para editar',
      empty: '—',
    },
    terms: {
      accept: 'Acepto los ',
      termsLink: 'Términos y Condiciones',
      and: ' y la ',
      privacyLink: 'Política de Privacidad',
      end: '.',
    },
    cta: {
      next: 'Siguiente',
      finish: 'Finalizar Activación',
    },
    edit: {
      name: 'Nombre',
      phone: 'Teléfono',
    },
    termsModal: {
      eyebrow: 'POLÍTICAS',
      titleFirst: 'Términos y ',
      titleAccent: 'Condiciones',
      empty: 'Términos no disponibles.',
    },
    errors: {
      enterCode: 'Introduce tu código de activación.',
      usePin: 'Usa un PIN de 4 dígitos.',
      savePassword: 'No se pudo guardar tu contraseña.',
      validateCode: 'No se pudo validar el código.',
      finish: 'No se pudo finalizar la activación.',
    },
    alerts: {
      activationTitle: 'Activación',
      termsTitle: 'Términos',
      termsMessage: 'Acepta los Términos y Condiciones para continuar.',
      activatedTitle: 'Activada',
      signInFailed: 'Tu cuenta se activó pero el inicio de sesión falló. Inicia sesión manualmente.',
    },
  },
};
