import React, { ReactElement } from 'react';
import { Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';

// Fecha o teclado ao tocar em qualquer area que nao seja um input ou botao.
// Envolve a tela inteira: o TouchableWithoutFeedback apenas CLONA o filho
// (nao insere uma View extra), entao o layout da tela permanece intacto.
// Inputs e TouchableOpacity sao responders e consomem o toque antes de chegar
// aqui - so toques em area "vazia" (fundo, header, espacamentos) disparam o
// dismiss. Resolve o caso do iOS, que nao tem uma barra de acoes do teclado
// para fechar/prosseguir e acaba com o teclado cobrindo o botao. No-op na web
// (nao ha teclado virtual).
export function DismissKeyboard({ children }: { children: ReactElement }) {
  if (Platform.OS === 'web') return children;
  return (
    <TouchableWithoutFeedback accessible={false} onPress={() => Keyboard.dismiss()}>
      {children}
    </TouchableWithoutFeedback>
  );
}
