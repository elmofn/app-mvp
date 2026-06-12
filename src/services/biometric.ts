import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricStatus =
  | 'unsupported' // hardware nao suporta
  | 'not-enrolled' // hardware ok, mas o usuario nao cadastrou biometria no SO
  | 'available'; // pronto para usar

export type BiometricResult = {
  success: boolean;
  error?: string;
  warning?: string;
};

export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'unsupported';

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return 'not-enrolled';

    return 'available';
  } catch (err) {
    console.warn('[biometric] failed to inspect hardware:', err);
    return 'unsupported';
  }
}

export async function authenticateWithBiometric(
  promptMessage = 'Unlock TravelBACK',
): Promise<BiometricResult> {
  try {
    // Usa o minimo de opcoes para evitar conflito entre versoes do SDK.
    // O prompt eh o nativo do SO: TouchID/FaceID no iOS, Fingerprint/Face
    // no Android. cancelLabel aparece como botao no prompt do Android.
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
    });
    console.log('[biometric] authenticateAsync result:', result);
    if (result.success) {
      return { success: true };
    }
    return {
      success: false,
      error: (result as { error?: string }).error,
      warning: (result as { warning?: string }).warning,
    };
  } catch (err) {
    console.warn('[biometric] authentication threw:', err);
    return { success: false, error: 'exception' };
  }
}
