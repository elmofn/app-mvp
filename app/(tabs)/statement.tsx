import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';


import { TopBar } from '@/src/components/Topbar';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';


export default function StatementScreen() {
  const scrollY = useSharedValue(0);

  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const isForcingAnimation = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      // Só escuta o ScrollView se NÃO estivermos forçando a animação de entrada
      if (!isForcingAnimation.value) {
        scrollY.value = event.contentOffset.y;
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (scrollY.value > 0) {
        // CENÁRIO 1: A tela já estava rolada, então usamos a rolagem nativa para subir.
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        // CENÁRIO 2: Mudança de aba.
        
        // Ativa o escudo para o ScrollView não atrapalhar
        isForcingAnimation.value = true; 
        
        // Coloca a barra preta imediatamente
        scrollY.value = 150;

        // Espera um pentelhésimo de segundo para a transição do menu do celular terminar
        setTimeout(() => {
          // Faz a animação suave e, quando terminar (callback), desativa o escudo
          scrollY.value = withTiming(0, { duration: 450 }, () => {
            isForcingAnimation.value = false;
          });
        }, 50);
      }
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.darkHeader}>
          <View style={{ height: 25 }} />

          {/* Mude este título para Extrato, Assistente, etc. */}
          <Text style={styles.greeting}>Extrato</Text>
          <Text style={styles.subtitle}>Página em construção...</Text>
          
        </View>
      </Animated.ScrollView>

      <TopBar scrollY={scrollY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  darkHeader: {
    backgroundColor: colors.background.dark,
    padding: 24,
    paddingTop: 38,
    height: 400, // Altura temporária só para ter o fundo preto
  },
  greeting: {
    color: colors.text.light,
    fontSize: 20,
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: 14,
    fontFamily: fonts.regular,
  }
});