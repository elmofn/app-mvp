import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import type { BannerCategory, SignInBanner } from '@/src/services/auth';
import { fonts } from '@/src/theme/typography';

type Props = {
  banners: SignInBanner[] | undefined;
  category: BannerCategory;
};

// Carousel de banners promocionais. Template unico (foto + gradient
// overlay) usado tanto na home quanto na travelshop. Os banners chegam
// num unico array no payload de SignIn e sao separados pelo campo
// `category`; o componente filtra a categoria pedida. Quando title vem
// vazio (ver exemplo da API), so renderiza a description.
export function BannersCarousel({ banners, category }: Props) {
  const items = (banners ?? []).filter(
    (b) => b.category.toLowerCase() === category.toLowerCase(),
  );
  if (items.length === 0) return null;

  return (
    <Animated.View entering={FadeInRight.delay(1100).duration(600)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannersSection}>
        {items.map((banner) => (
          <View key={banner.id} style={styles.bannerCard}>
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
          </View>
        ))}
        <View style={{ width: 20 }} />
      </ScrollView>
    </Animated.View>
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
