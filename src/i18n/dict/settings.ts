import type { SupportedLang } from '@/src/services/locale';

// Namespace: settings — tela de perfil/configuracoes (formulario, pickers de
// moeda e idioma, modal de verificacao, troca de senha e exclusao de conta) +
// componentes CountryPicker e EditReviewFieldModal.
export const settings: Record<SupportedLang, Record<string, any>> = {
  'en-US': {
    // Header
    headerTitle: 'User Data',
    titleLine1: 'User',
    titleAccent: 'Profile',
    pageDescription: 'Update or set up your information as you prefer.',

    // Form labels
    nameLabel: 'Name',
    phoneLabel: 'Phone Number',
    emailLabel: 'E-mail',
    currencyLabel: 'Currency',
    languageLabel: 'Language',
    selectCurrency: 'Select currency',
    verified: 'Verified',
    notVerified: 'Not verified',

    // Action buttons
    logOut: 'Log Out',
    changePassword: 'Change Password',
    deleteAccount: 'Delete Account',
    saveChanges: 'Save Changes',
    authCodeButton: 'Authentication Code',

    // Authentication code modal (rotating navigation code)
    authCodeEyebrow: 'AUTHENTICATION',
    authCodeTitleBase: 'Your',
    authCodeTitleAccent: 'code',
    authCodeDescription:
      'Use this code to securely access the web marketplace. It refreshes automatically when it expires.',
    authCodeExpiresIn: 'Expires in {time}',
    authCodeLoading: 'Generating code…',
    authCodeError: "Couldn't generate the code.",
    authCodeRetry: 'Try again',
    authCodeCopied: 'Copied!',
    authCodeWhatsApp: 'Send to myself on WhatsApp',

    // Pickers modal
    selectCurrencyTitle: 'SELECT CURRENCY',
    selectLanguageTitle: 'SELECT LANGUAGE',
    currencySearchPlaceholder: 'Search currency or code',
    currenciesError: 'Could not load currencies.',
    currenciesEmpty: 'No currencies match your search.',

    // Verify modal — eyebrows
    eyebrowChangePassword: 'CHANGE PASSWORD',
    eyebrowDeleteAccount: 'DELETE ACCOUNT',
    eyebrowVerifyIdentity: 'VERIFY YOUR IDENTITY',
    // Verify modal — titles (split into base + accent)
    verifyTitleBase: 'Verify',
    verifyTitleAccent: 'identity',
    deleteTitleBase: 'Confirm',
    deleteTitleAccent: 'delete',
    confirmTitleBase: 'Confirm',
    confirmTitleAccent: 'changes',
    verifyDescription: 'We sent a verification code to {email}. Enter it below to continue.',
    codePlaceholder: '0 0 0 0 0 0',

    // Phone verification (SMS) — triggered from the phone field in settings
    verifyPhoneButton: 'Verify',
    verifyPhoneConfirmTitle: 'Verify phone number',
    verifyPhoneConfirmMessage:
      'We will send a verification code via SMS to {phone}. Do you want to continue?',
    verifyPhoneConfirmCta: 'Send code',
    eyebrowVerifyPhone: 'VERIFY YOUR PHONE',
    verifyPhoneTitleBase: 'Verify',
    verifyPhoneTitleAccent: 'phone',
    verifyPhoneDescription: 'We sent a code via SMS to {phone}. Enter it below to continue.',
    phoneVerifiedTitle: 'Phone verified',
    phoneVerifiedMessage: 'Your phone number has been verified.',
    eyebrowVerifyEmail: 'VERIFY YOUR EMAIL',
    verifyEmailTitleBase: 'Verify',
    verifyEmailTitleAccent: 'email',
    verifyEmailConfirmMessage: "We'll send a verification code to {email}.",
    verifyEmailConfirmCta: 'Send code',
    verifyEmailDescription: 'We sent a code to {email}. Enter it below to continue.',
    emailVerifiedTitle: 'Email verified',
    emailVerifiedMessage: 'Your email has been verified.',

    // Resend
    resendSending: 'Sending code…',
    resendIn: 'Resend in {time}',
    resendCode: 'Resend code',
    helpNotice: "If you don't have access to this email or phone, please contact support.",

    // Verify buttons
    verify: 'Verify',
    verifyAndDelete: 'Verify & Delete',
    verifyAndSave: 'Verify & Save',

    // New PIN stage
    newPinEyebrow: 'CHANGE PASSWORD',
    newPinTitleBase: 'New',
    newPinTitleAccent: 'PIN',
    newPinDescription: 'Choose a new 4-digit PIN to protect your account.',
    newPinPlaceholder: '0 0 0 0',
    saveNewPin: 'Save New PIN',

    // Alerts
    profileUpdatedTitle: 'Profile updated',
    profileUpdatedMessage: 'Your changes have been saved.',
    updateFailedTitle: 'Update failed',
    updateFailedMessage: 'Could not save your changes.',
    sendCodeFailedMessage: 'Could not send the verification code.',
    validateCodeFailedMessage: 'Could not validate the code.',
    deleteFailedTitle: 'Delete failed',
    deleteFailedMessage: 'Could not delete your account.',
    passwordUpdatedTitle: 'Password updated',
    passwordUpdatedMessage: 'Your new PIN has been saved.',
    saveNewPinFailedMessage: 'Could not save your new PIN.',
    logoutTitle: 'Log Out',
    logoutMessage: 'Do you want to end your TravelBACK session?',
    deleteAccountTitle: 'Delete Account',
    deleteAccountMessage:
      'Choose how you’d like to proceed. You can delete this account only, or also prevent new accounts from being created using the same user information. This action cannot be undone.',
    deleteOnlyAccount: 'Delete account',
    deleteAndBlockEmail: 'Delete and block account',

    // CountryPicker
    selectCountry: 'Select country',
    countrySearchPlaceholder: 'Search country or code',
    countryEmpty: 'No country matches your search.',

    // EditReviewFieldModal
    editFieldEyebrow: 'EDIT {field}',
    editFieldTitleBase: 'New',
    editFieldPlaceholder: 'Enter the new {field}',
    fieldRequired: 'Please fill out this field.',
    valueInUse: 'This value is already in use on another account.',
    saveChangeFailed: 'Could not save the change.',
  },
  'pt-BR': {
    // Header
    headerTitle: 'Dados do Usuário',
    titleLine1: 'Perfil do',
    titleAccent: 'Usuário',
    pageDescription: 'Atualize ou configure seus dados de acordo com a sua preferência.',

    // Form labels
    nameLabel: 'Nome',
    phoneLabel: 'Número de Telefone',
    emailLabel: 'E-mail',
    currencyLabel: 'Moeda',
    languageLabel: 'Idioma',
    selectCurrency: 'Selecionar moeda',
    verified: 'Verificado',
    notVerified: 'Não verificado',

    // Action buttons
    logOut: 'Sair da Conta',
    changePassword: 'Alterar Senha',
    deleteAccount: 'Deletar Conta',
    saveChanges: 'Salvar Alterações',
    authCodeButton: 'Código de Autenticação',

    // Authentication code modal (rotating navigation code)
    authCodeEyebrow: 'AUTENTICAÇÃO',
    authCodeTitleBase: 'Seu',
    authCodeTitleAccent: 'código',
    authCodeDescription:
      'Use este código para acessar o marketplace web com segurança. Ele é renovado automaticamente ao expirar.',
    authCodeExpiresIn: 'Expira em {time}',
    authCodeLoading: 'Gerando código…',
    authCodeError: 'Não foi possível gerar o código.',
    authCodeRetry: 'Tentar novamente',
    authCodeCopied: 'Copiado!',
    authCodeWhatsApp: 'Enviar para mim no WhatsApp',

    // Pickers modal
    selectCurrencyTitle: 'SELECIONAR MOEDA',
    selectLanguageTitle: 'SELECIONAR IDIOMA',
    currencySearchPlaceholder: 'Buscar moeda ou código',
    currenciesError: 'Não foi possível carregar as moedas.',
    currenciesEmpty: 'Nenhuma moeda corresponde à sua busca.',

    // Verify modal — eyebrows
    eyebrowChangePassword: 'ALTERAR SENHA',
    eyebrowDeleteAccount: 'DELETAR CONTA',
    eyebrowVerifyIdentity: 'VERIFIQUE SUA IDENTIDADE',
    // Verify modal — titles
    verifyTitleBase: 'Verificar',
    verifyTitleAccent: 'identidade',
    deleteTitleBase: 'Confirmar',
    deleteTitleAccent: 'exclusão',
    confirmTitleBase: 'Confirmar',
    confirmTitleAccent: 'alterações',
    verifyDescription: 'Enviamos um código de verificação para {email}. Digite-o abaixo para continuar.',
    codePlaceholder: '0 0 0 0 0 0',

    // Phone verification (SMS) — disparada pelo campo de telefone no settings
    verifyPhoneButton: 'Verificar',
    verifyPhoneConfirmTitle: 'Verificar telefone',
    verifyPhoneConfirmMessage:
      'Vamos enviar um código de verificação por SMS para {phone}. Deseja continuar?',
    verifyPhoneConfirmCta: 'Enviar código',
    eyebrowVerifyPhone: 'VERIFIQUE SEU TELEFONE',
    verifyPhoneTitleBase: 'Verificar',
    verifyPhoneTitleAccent: 'telefone',
    verifyPhoneDescription: 'Enviamos um código por SMS para {phone}. Digite-o abaixo para continuar.',
    phoneVerifiedTitle: 'Telefone verificado',
    phoneVerifiedMessage: 'Seu número de telefone foi verificado.',
    eyebrowVerifyEmail: 'VERIFIQUE SEU E-MAIL',
    verifyEmailTitleBase: 'Verificar',
    verifyEmailTitleAccent: 'e-mail',
    verifyEmailConfirmMessage: 'Vamos enviar um código de verificação para {email}.',
    verifyEmailConfirmCta: 'Enviar código',
    verifyEmailDescription: 'Enviamos um código para {email}. Digite-o abaixo para continuar.',
    emailVerifiedTitle: 'E-mail verificado',
    emailVerifiedMessage: 'Seu e-mail foi verificado.',

    // Resend
    resendSending: 'Enviando código…',
    resendIn: 'Reenviar em {time}',
    resendCode: 'Reenviar código',
    helpNotice: 'Se você não tem acesso a este e-mail ou telefone, entre em contato com o suporte.',

    // Verify buttons
    verify: 'Verificar',
    verifyAndDelete: 'Verificar e Deletar',
    verifyAndSave: 'Verificar e Salvar',

    // New PIN stage
    newPinEyebrow: 'ALTERAR SENHA',
    newPinTitleBase: 'Novo',
    newPinTitleAccent: 'PIN',
    newPinDescription: 'Escolha um novo PIN de 4 dígitos para proteger sua conta.',
    newPinPlaceholder: '0 0 0 0',
    saveNewPin: 'Salvar Novo PIN',

    // Alerts
    profileUpdatedTitle: 'Perfil atualizado',
    profileUpdatedMessage: 'Suas alterações foram salvas.',
    updateFailedTitle: 'Falha ao atualizar',
    updateFailedMessage: 'Não foi possível salvar suas alterações.',
    sendCodeFailedMessage: 'Não foi possível enviar o código de verificação.',
    validateCodeFailedMessage: 'Não foi possível validar o código.',
    deleteFailedTitle: 'Falha ao deletar',
    deleteFailedMessage: 'Não foi possível deletar sua conta.',
    passwordUpdatedTitle: 'Senha atualizada',
    passwordUpdatedMessage: 'Seu novo PIN foi salvo.',
    saveNewPinFailedMessage: 'Não foi possível salvar seu novo PIN.',
    logoutTitle: 'Sair da Conta',
    logoutMessage: 'Deseja encerrar sua sessão no TravelBACK?',
    deleteAccountTitle: 'Deletar Conta',
    deleteAccountMessage:
      'Escolha como deseja prosseguir. Você pode excluir apenas esta conta ou também impedir que novas contas sejam criadas usando os mesmos dados do usuário. Esta ação é irreversível.',
    deleteOnlyAccount: 'Deletar conta',
    deleteAndBlockEmail: 'Deletar e bloquear conta',

    // CountryPicker
    selectCountry: 'Selecionar país',
    countrySearchPlaceholder: 'Buscar país ou código',
    countryEmpty: 'Nenhum país corresponde à sua busca.',

    // EditReviewFieldModal
    editFieldEyebrow: 'EDITAR {field}',
    editFieldTitleBase: 'Novo',
    editFieldPlaceholder: 'Digite o novo {field}',
    fieldRequired: 'Por favor, preencha este campo.',
    valueInUse: 'Este valor já está em uso em outra conta.',
    saveChangeFailed: 'Não foi possível salvar a alteração.',
  },
  'es-ES': {
    // Header
    headerTitle: 'Datos del Usuario',
    titleLine1: 'Perfil del',
    titleAccent: 'Usuario',
    pageDescription: 'Actualiza o configura tus datos según tu preferencia.',

    // Form labels
    nameLabel: 'Nombre',
    phoneLabel: 'Número de Teléfono',
    emailLabel: 'E-mail',
    currencyLabel: 'Moneda',
    languageLabel: 'Idioma',
    selectCurrency: 'Seleccionar moneda',
    verified: 'Verificado',
    notVerified: 'No verificado',

    // Action buttons
    logOut: 'Cerrar Sesión',
    changePassword: 'Cambiar Contraseña',
    deleteAccount: 'Eliminar Cuenta',
    saveChanges: 'Guardar Cambios',
    authCodeButton: 'Código de Autenticación',

    // Authentication code modal (rotating navigation code)
    authCodeEyebrow: 'AUTENTICACIÓN',
    authCodeTitleBase: 'Tu',
    authCodeTitleAccent: 'código',
    authCodeDescription:
      'Usa este código para acceder al marketplace web de forma segura. Se renueva automáticamente al expirar.',
    authCodeExpiresIn: 'Expira en {time}',
    authCodeLoading: 'Generando código…',
    authCodeError: 'No se pudo generar el código.',
    authCodeRetry: 'Reintentar',
    authCodeCopied: '¡Copiado!',
    authCodeWhatsApp: 'Enviarme por WhatsApp',

    // Pickers modal
    selectCurrencyTitle: 'SELECCIONAR MONEDA',
    selectLanguageTitle: 'SELECCIONAR IDIOMA',
    currencySearchPlaceholder: 'Buscar moneda o código',
    currenciesError: 'No se pudieron cargar las monedas.',
    currenciesEmpty: 'Ninguna moneda coincide con tu búsqueda.',

    // Verify modal — eyebrows
    eyebrowChangePassword: 'CAMBIAR CONTRASEÑA',
    eyebrowDeleteAccount: 'ELIMINAR CUENTA',
    eyebrowVerifyIdentity: 'VERIFICA TU IDENTIDAD',
    // Verify modal — titles
    verifyTitleBase: 'Verificar',
    verifyTitleAccent: 'identidad',
    deleteTitleBase: 'Confirmar',
    deleteTitleAccent: 'eliminación',
    confirmTitleBase: 'Confirmar',
    confirmTitleAccent: 'cambios',
    verifyDescription: 'Enviamos un código de verificación a {email}. Ingrésalo abajo para continuar.',
    codePlaceholder: '0 0 0 0 0 0',

    // Phone verification (SMS) — activada desde el campo de teléfono en ajustes
    verifyPhoneButton: 'Verificar',
    verifyPhoneConfirmTitle: 'Verificar teléfono',
    verifyPhoneConfirmMessage:
      'Enviaremos un código de verificación por SMS a {phone}. ¿Deseas continuar?',
    verifyPhoneConfirmCta: 'Enviar código',
    eyebrowVerifyPhone: 'VERIFICA TU TELÉFONO',
    verifyPhoneTitleBase: 'Verificar',
    verifyPhoneTitleAccent: 'teléfono',
    verifyPhoneDescription: 'Enviamos un código por SMS a {phone}. Ingrésalo abajo para continuar.',
    phoneVerifiedTitle: 'Teléfono verificado',
    phoneVerifiedMessage: 'Tu número de teléfono ha sido verificado.',
    eyebrowVerifyEmail: 'VERIFICA TU CORREO',
    verifyEmailTitleBase: 'Verificar',
    verifyEmailTitleAccent: 'correo',
    verifyEmailConfirmMessage: 'Enviaremos un código de verificación a {email}.',
    verifyEmailConfirmCta: 'Enviar código',
    verifyEmailDescription: 'Enviamos un código a {email}. Ingrésalo abajo para continuar.',
    emailVerifiedTitle: 'Correo verificado',
    emailVerifiedMessage: 'Tu correo ha sido verificado.',

    // Resend
    resendSending: 'Enviando código…',
    resendIn: 'Reenviar en {time}',
    resendCode: 'Reenviar código',
    helpNotice: 'Si no tienes acceso a este correo o teléfono, ponte en contacto con soporte.',

    // Verify buttons
    verify: 'Verificar',
    verifyAndDelete: 'Verificar y Eliminar',
    verifyAndSave: 'Verificar y Guardar',

    // New PIN stage
    newPinEyebrow: 'CAMBIAR CONTRASEÑA',
    newPinTitleBase: 'Nuevo',
    newPinTitleAccent: 'PIN',
    newPinDescription: 'Elige un nuevo PIN de 4 dígitos para proteger tu cuenta.',
    newPinPlaceholder: '0 0 0 0',
    saveNewPin: 'Guardar Nuevo PIN',

    // Alerts
    profileUpdatedTitle: 'Perfil actualizado',
    profileUpdatedMessage: 'Tus cambios se han guardado.',
    updateFailedTitle: 'Error al actualizar',
    updateFailedMessage: 'No se pudieron guardar tus cambios.',
    sendCodeFailedMessage: 'No se pudo enviar el código de verificación.',
    validateCodeFailedMessage: 'No se pudo validar el código.',
    deleteFailedTitle: 'Error al eliminar',
    deleteFailedMessage: 'No se pudo eliminar tu cuenta.',
    passwordUpdatedTitle: 'Contraseña actualizada',
    passwordUpdatedMessage: 'Tu nuevo PIN se ha guardado.',
    saveNewPinFailedMessage: 'No se pudo guardar tu nuevo PIN.',
    logoutTitle: 'Cerrar Sesión',
    logoutMessage: '¿Deseas finalizar tu sesión en TravelBACK?',
    deleteAccountTitle: 'Eliminar Cuenta',
    deleteAccountMessage:
      'Elige cómo deseas continuar. Puedes eliminar únicamente esta cuenta o también impedir que se creen nuevas cuentas utilizando los mismos datos del usuario. Esta acción no se puede deshacer.',
    deleteOnlyAccount: 'Eliminar cuenta',
    deleteAndBlockEmail: 'Eliminar y bloquear cuenta',

    // CountryPicker
    selectCountry: 'Seleccionar país',
    countrySearchPlaceholder: 'Buscar país o código',
    countryEmpty: 'Ningún país coincide con tu búsqueda.',

    // EditReviewFieldModal
    editFieldEyebrow: 'EDITAR {field}',
    editFieldTitleBase: 'Nuevo',
    editFieldPlaceholder: 'Ingresa el nuevo {field}',
    fieldRequired: 'Por favor, completa este campo.',
    valueInUse: 'Este valor ya está en uso en otra cuenta.',
    saveChangeFailed: 'No se pudo guardar el cambio.',
  },
};
