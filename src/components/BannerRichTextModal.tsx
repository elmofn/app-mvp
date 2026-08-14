import { XIcon } from 'phosphor-react-native';
import React from 'react';
import { Linking, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

type Props = {
  visible: boolean;
  title: string; // mantido por compat com o caller; o HTML traz o proprio titulo
  html: string;
  onClose: () => void;
};

// Modal aberto ao tocar num banner: renderiza o richtext do banner num WebView
// em TELA CHEIA com fundo TRANSPARENTE. O HTML do backend desenha TODA a UI
// (overlay + card + botoes + animacao), entao o app so prove: o container
// transparente, um botao de fechar flutuante e a interceptacao de links (o CTA
// abre no navegador do sistema em vez de navegar dentro do WebView).
//
// ⚠️ CONTRATO DE CONTEUDO: o backend precisa mandar um HTML COMPLETO e estilizado
// (como o mock do card promocional, com seu proprio overlay/card/CSS) — NAO um
// trecho solto de <p>. Num trecho sem CSS o texto apareceria pequeno e sem estilo
// sobre o fundo transparente (a tela de tras apareceria atras).
//
// Seguranca: o conteudo vem do NOSSO backend (confiavel). javaScript fica
// DESLIGADO — a animacao do card e CSS puro e nao precisamos de JS injetado — como
// defesa extra ao renderizar HTML remoto.
export function BannerRichTextModal({ visible, html, onClose }: Props) {
  const insets = useSafeAreaInsets();

  // Deixa o conteudo do proprio HTML carregar (about:blank / data:), mas
  // intercepta qualquer navegacao http(s) — o CTA "Contratar" — abrindo no
  // navegador do sistema em vez de dentro do WebView.
  const onNavRequest = (req: WebViewNavigation): boolean => {
    const url = req.url ?? '';
    if (/^https?:\/\//i.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <WebView
          originWhitelist={['*']}
          source={{ html: html || '<p></p>' }}
          style={styles.webview}
          // Fundo transparente para manter a cara de "dentro do app". iOS usa
          // opaque={false}; no Android a transparencia vem do style. ⚠️ CONFERIR
          // nas duas plataformas: se aparecer fundo preto/branco atras do card,
          // ajustar aqui (ex.: androidLayerType="software").
          opaque={false}
          androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          javaScriptEnabled={false}
          onShouldStartLoadWithRequest={onNavRequest}
        />

        {/* Botao de fechar flutuante: o mock nao traz um X, entao garantimos a
            saida sempre (alem do back do Android via onRequestClose). */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <XIcon size={22} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
