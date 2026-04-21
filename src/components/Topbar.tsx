import { colors } from '@/src/theme/colors';
import { Bell, CaretRight, Question, User } from 'phosphor-react-native';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

// Pegamos a largura da tela para saber até onde o logo pode deslizar
const { width } = Dimensions.get('window');

interface TopBarProps {
  scrollY: SharedValue<number>;
}

export function TopBar({ scrollY }: TopBarProps) {
  // Distância do scroll em que a animação deve terminar (80 pixels)
  const SCROLL_DISTANCE = 150;

  // Animação dos ícones da direita (somem)
  const rightIconsStyle = useAnimatedStyle(() => {
    // A opacidade vai de 1 (visível) para 0 (invisível)
    const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [1, 0], Extrapolation.CLAMP);
    // Move levemente para cima enquanto some para um efeito mais refinado
    const translateY = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, -10], Extrapolation.CLAMP);
    
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Animação do logo (CaretRight) deslizando para a direita
  const logoStyle = useAnimatedStyle(() => {
    // Calcula o limite direito: Largura da tela - 24px (padding esq) - 24px (padding dir) - 24px (tamanho do ícone)
    const maxTranslateX = width - 72; 
    
    // Move de 0 (esquerda) até maxTranslateX (direita)
    const translateX = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, maxTranslateX], Extrapolation.CLAMP);

    return {
      transform: [{ translateX }],
    };
  });

  // Fundo da TopBar: Transparente no topo, fica Preto ao rolar para cobrir o conteúdo que passa por baixo
  const containerStyle = useAnimatedStyle(() => {
    const backgroundColor = scrollY.value > 10 ? colors.background.dark : 'transparent';
    return {
      backgroundColor,
    };
  });

  return (
    <Animated.View style={[styles.topBarWrapper, containerStyle]}>
      
      <Animated.View style={logoStyle}>
        <CaretRight size={24} color={colors.text.light} />
      </Animated.View>

      <Animated.View style={[styles.topIconsRight, rightIconsStyle]}>
        <Question size={24} color={colors.text.light} />
        <Bell size={24} color={colors.text.light} />
        <User size={24} color={colors.text.light} />
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBarWrapper: {
    // Faz a barra flutuar (sticky) e ficar por cima de tudo
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    // Espaçamento do topo para não colar no relógio do celular
    paddingTop: 35,
    paddingBottom: 8,
  },
  topIconsRight: {
    flexDirection: 'row',
    gap: 16,
  },
});