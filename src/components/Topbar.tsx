import { useRouter } from 'expo-router';
import { Bell, CaretRight, Question, User } from 'phosphor-react-native';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SharedValue } from 'react-native-reanimated'; // 👈 Importação correta do tipo
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated';

import { colors } from '@/src/theme/colors';

// Pegamos a largura da tela para saber até onde o logo pode deslizar
const { width } = Dimensions.get('window');

interface TopBarProps {
  scrollY: SharedValue<number>; // 👈 Uso correto sem o "Animated."
}

export function TopBar({ scrollY }: TopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 👈 Correção do fundo branco da StatusBar
  
  // Distância do scroll em que a animação deve terminar (80 pixels)
  const SCROLL_DISTANCE = 150;

  // Animação dos ícones da direita (somem)
  const rightIconsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, -10], Extrapolation.CLAMP);
    
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Animação do logo (CaretRight) deslizando para a direita
  const logoStyle = useAnimatedStyle(() => {
    const maxTranslateX = width - 72; 
    const translateX = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, maxTranslateX], Extrapolation.CLAMP);

    return {
      transform: [{ translateX }],
    };
  });

  // Fundo da TopBar
  const containerStyle = useAnimatedStyle(() => {
    const backgroundColor = scrollY.value > 10 ? colors.background.dark : 'transparent';
    return {
      backgroundColor,
    };
  });

  return (
    // 👈 Aplicamos o insets.top para a barra descer respeitando a câmera do celular
    <Animated.View style={[styles.topBarWrapper, containerStyle, { paddingTop: insets.top + 10 }]}>
      
      <Animated.View style={logoStyle}>
        <CaretRight size={24} color={colors.text.light} />
      </Animated.View>

      <Animated.View style={[styles.topIconsRight, rightIconsStyle]}>
        <TouchableOpacity onPress={() => router.push('/support')} activeOpacity={0.7}>
          <Question size={24} color={colors.text.light} />
        </TouchableOpacity>
        
        <TouchableOpacity activeOpacity={0.7}>
          <Bell size={24} color={colors.text.light} />
        </TouchableOpacity>
        
        {/* 👈 Roteamento para a página de configurações */}
        <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.7}>
          <User size={24} color={colors.text.light} />
        </TouchableOpacity>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  topIconsRight: {
    flexDirection: 'row',
    gap: 16,
  },
});