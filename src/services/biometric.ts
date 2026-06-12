import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricStatus =
  | 'unsupported' // hardware nao suporta
  | 'not-enrolled' // hardware ok, mas o usuario nao cadastrou biometria no SO
  | 'available'; // pronto para usar

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
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // permite PIN/senha do device como fallback
    });
    return result.success;
  } catch (err) {
    console.warn('[biometric] authentication threw:', err);
    return false;
  }
}
