import React from 'react';
import { Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

type Props = {
  visible: boolean;
  title: string; // mantido por compat com o caller; o HTML traz o proprio titulo
  html: string;
  onClose: () => void;
};

// Injeta um "X" de fechar NO CANTO do card (o app nao sabe onde o card esta -
// ele e desenhado pelo HTML dentro do WebView, entao posicionamos via DOM).
// Procura o card (.alert-modal ou o primeiro bloco do body), garante que ele
// seja o contexto de posicionamento e prende um X absoluto no topo-direito. Ao
// tocar, avisa o app via postMessage('close'). try/catch: se algo falhar, cai
// para o body (X no topo da tela) em vez de deixar o usuario sem saida.
const CLOSE_BUTTON_JS = `
(function () {
  try {
    if (document.getElementById('__rn_close')) return;
    var card = document.querySelector('.alert-modal')
      || document.body.firstElementChild
      || document.body;
    if (window.getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
    var btn = document.createElement('div');
    btn.id = '__rn_close';
    btn.innerHTML = '&#10005;';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Fechar');
    btn.style.cssText = 'position:absolute;top:10px;right:10px;width:30px;height:30px;'
      + 'display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;'
      + 'color:#0F022D;opacity:0.5;cursor:pointer;z-index:99999;';
    btn.addEventListener('click', function () {
      window.ReactNativeWebView.postMessage('close');
    });
    card.appendChild(btn);
  } catch (e) {}
})();
true;
`;

// Modal aberto ao tocar num banner: renderiza o richtext do banner num WebView
// em TELA CHEIA com fundo TRANSPARENTE. O HTML do backend desenha TODA a UI
// (overlay + card + botoes + animacao); o app so prove o container transparente,
// o X injetado no canto do card e a interceptacao do CTA (abre no navegador).
//
// ⚠️ CONTRATO DE CONTEUDO: o backend precisa mandar um HTML COMPLETO e estilizado
// (como o mock do card promocional, com seu proprio overlay/card/CSS) — NAO um
// trecho solto de <p>.
//
// Seguranca: o conteudo vem do NOSSO backend (confiavel). O JS habilitado serve
// so para injetar o botao de fechar (CLOSE_BUTTON_JS); nao executamos JS remoto
// arbitrario alem do que o HTML do proprio backend traz.
export function BannerRichTextModal({ visible, html, onClose }: Props) {
  // Deixa o conteudo do proprio HTML carregar (about:blank / data:), mas
  // intercepta qualquer navegacao http(s) — o CTA — abrindo no navegador do
  // sistema em vez de dentro do WebView.
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
          // JS ligado apenas para injetar o X de fechar no canto do card.
          javaScriptEnabled
          injectedJavaScript={CLOSE_BUTTON_JS}
          onMessage={(e) => {
            if (e.nativeEvent.data === 'close') onClose();
          }}
          onShouldStartLoadWithRequest={onNavRequest}
        />
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
});
