import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SupportContent } from '@/src/components/SupportContent';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserLanguage } from '@/src/services/locale';

export default function SupportScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { account, refreshAccount } = useAuth();
  const lang = getUserLanguage(account);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="light" />
      <SupportContent
        lang={lang}
        bottomInset={tabBarHeight + 24}
        onTermsPress={() => router.push('/terms')}
        onRefresh={refreshAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
});
