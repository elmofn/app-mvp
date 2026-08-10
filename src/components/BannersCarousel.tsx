import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { BannerCategory, SignInBanner } from '@/src/services/auth';
import { fonts } from '@/src/theme/typography';

import { BannerRichTextModal } from './BannerRichTextModal';

type Props = {
  banners: SignInBanner[] | undefined;
  category: BannerCategory;
};

// richtext do banner, tolerando as duas grafias que a API pode mandar.
const bannerHtml = (b: SignInBanner): string => b.richtext ?? b.richText ?? '';

// Carousel de banners promocionais. Template unico (foto + gradient
// overlay) usado tanto na home quanto na travelshop. Os banners chegam
// num unico array no payload de SignIn e sao separados pelo campo
// `category`; o componente filtra a categoria pedida. Quando title vem
// vazio (ver exemplo da API), so renderiza a description.
export function BannersCarousel({ banners, category }: Props) {
  const [selected, setSelected] = useState<SignInBanner | null>(null);

  const items = (banners ?? []).filter(
    (b) => b.category.toLowerCase() === category.toLowerCase(),
  );

  // Diagnostico temporario: quantos banners chegam e quais categorias existem.
  console.log(
    '[banners]', category,
    '| total=', banners?.length ?? 0,
    '| match=', items.length,
    '| categorias=', (banners ?? []).map((b) => b.category),
  );

  if (items.length === 0) return null;

  return (
    // Sem animacao de entrada (reanimated): o carregamento assincrono dos
    // hoteis recomendados re-faz o layout e a animacao "entering" podia deixar
    // os banners presos invisiveis. Renderizamos direto para aparecerem sempre.
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannersSection}>
        {items.map((banner) => (
          // Tocar no banner abre o modal com o richtext. Sem richtext, o card
          // fica nao-interativo (disabled) para nao dar feedback de toque a toa.
          <TouchableOpacity
            key={banner.id}
            style={styles.bannerCard}
            activeOpacity={0.85}
            disabled={!bannerHtml(banner)}
            onPress={() => setSelected(banner)}
          >
            <Image source={{ uri: banner.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.bannerOverlay}
            >
              {banner.description ? (
                <Text style={styles.bannerDescription}>{banner.description}</Text>
              ) : null}
              {banner.title ? (
                <Text style={styles.bannerTitle}>{banner.title.toUpperCase()}</Text>
              ) : null}
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <View style={{ width: 20 }} />
      </ScrollView>

      <BannerRichTextModal
        visible={!!selected}
        title={selected?.title ?? ''}
        html={selected ? bannerHtml(selected) : ''}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannersSection: {
    paddingLeft: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  bannerCard: {
    width: 200,
    height: 260,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
    gap: 6,
  },
  bannerDescription: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: fonts.bold,
    lineHeight: 18,
  },
  bannerTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
  },
});
