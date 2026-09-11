import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SupportContent } from '@/src/components/SupportContent';
import { useT } from '@/src/i18n';
import { getDeviceLanguage } from '@/src/services/locale';

export default function HelpScreen() {
  // Tela acessada antes do login - usa o idioma configurado no dispositivo.
  const lang = getDeviceLanguage();
  const { t } = useT();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <SupportContent
        lang={lang}
        showTravelAssistant={false}
        showBackButton
        titleFirst={t('support.helpTitleFirst')}
        titleAccent={t('support.helpTitleAccent')}
        titleAfter={t('support.helpTitleAfter')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
});
