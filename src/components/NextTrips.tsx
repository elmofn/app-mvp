import { MapPinIcon } from 'phosphor-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';

import type { SignInNextTrip } from '@/src/services/auth';
import { pickGenericColor } from '@/src/services/cityPhoto';
import { useT } from '@/src/i18n';
import { fonts } from '@/src/theme/typography';

type Props = {
  trips: SignInNextTrip[] | undefined;
};

// Imagem do card: foto real da cidade (Pexels) quando ha URL e ela carrega;
// senao (sem foto, ou a URL falhou no onError) um generico bonito - fundo de
// cor estavel por cidade + nome + pin. Nunca um quadro cinza quebrado.
function TripImage({ trip }: { trip: SignInNextTrip }) {
  const [failed, setFailed] = React.useState(false);

  if (trip.imageUrl && !failed) {
    return (
      <Image
        source={{ uri: trip.imageUrl }}
        style={styles.tripImg}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.tripGeneric, { backgroundColor: pickGenericColor(trip.id) }]}>
      <MapPinIcon size={40} color="rgba(255,255,255,0.9)" weight="fill" />
      <Text style={styles.tripGenericText} numberOfLines={2}>
        {trip.title}
      </Text>
    </View>
  );
}

// Secao "Next Trip Ideas" da home. Renderiza um card por viagem do
// payload; quando o array vem vazio (conta nova / backend sem conteudo)
// nao renderiza nada, mesmo padrao do ActivityHighlights.
export function NextTrips({ trips }: Props) {
  const { t } = useT();

  if (!trips || trips.length === 0) return null;

  return (
    <View style={styles.tripsSection}>
      <Animated.View entering={FadeInDown.delay(750).duration(500)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.nextTitle')}</Text>
        <Text style={styles.sectionTitleItalic}>
          {t('home.destinationsTitle')}<Text style={styles.sectionTitle}>.</Text>
        </Text>
        <Text style={styles.sectionSubtitle}>{t('home.bookYourTrip')}</Text>
      </Animated.View>

      {trips.map((trip, index) => (
        <React.Fragment key={trip.id}>
          <Animated.View
            entering={
              index % 2 === 0
                ? FadeInLeft.delay(850 + index * 100).duration(500)
                : FadeInRight.delay(850 + index * 100).duration(500)
            }
          >
            <TouchableOpacity style={styles.tripCard} activeOpacity={0.9}>
              <View style={styles.tripImgBox}>
                <TripImage trip={trip} />
                <View style={styles.tripTag}>
                  <View style={styles.tripTagDot} />
                  <Text style={styles.tripTagText}>{trip.tag}</Text>
                </View>
              </View>
              <View style={styles.tripInfo}>
                <Text style={styles.tripInfoTitle}>{trip.title}</Text>
                <Text style={styles.tripInfoDesc} numberOfLines={2}>
                  {trip.description}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
          {index < trips.length - 1 && <View style={styles.tripDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tripsSection: {
    padding: 20,
    paddingTop: 72,
    marginBottom: -20,
  },
  sectionHeader: {
    marginBottom: 42,
  },
  sectionTitle: {
    fontSize: 45,
    fontFamily: fonts.bold,
    color: '#1a1a1a',
    lineHeight: 36,
  },
  sectionTitleItalic: {
    fontSize: 45,
    fontFamily: fonts.italic,
    color: '#f07167',
    lineHeight: 36,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: fonts.italic,
    color: '#6c757d',
    marginTop: 4,
    letterSpacing: 1,
  },
  tripCard: {
    marginBottom: 24,
  },
  tripImgBox: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#CCC',
  },
  tripImg: {
    width: '100%',
    height: '100%',
  },
  tripGeneric: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  tripGenericText: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  tripTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(20, 10, 50, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#85EDD3',
  },
  tripTagText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  tripInfo: {
    marginBottom: 4,
  },
  tripInfoTitle: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  tripInfoDesc: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 8,
  },
  tripDivider: {
    height: 2,
    width: 60,
    backgroundColor: '#7D7BFE',
    marginBottom: 40,
  },
});
