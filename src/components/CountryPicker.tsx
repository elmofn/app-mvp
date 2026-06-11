import { MagnifyingGlassIcon, XIcon } from 'phosphor-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COUNTRIES, Country } from '@/src/data/countries';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCode?: string;
};

export function CountryPicker({ visible, onClose, onSelect, selectedCode }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.replace('+', '').includes(q.replace('+', '')) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Select country</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={8} activeOpacity={0.7}>
                <XIcon size={22} color={colors.text.dark} weight="bold" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchRow}>
            <MagnifyingGlassIcon size={18} color={colors.text.muted} weight="regular" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code"
              placeholderTextColor="#B5B5BD"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const isSelected = item.code === selectedCode;
              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item);
                    handleClose();
                  }}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.dial, isSelected && styles.dialSelected]}>{item.dial}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No country matches your search.</Text>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,2,45,0.55)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E7',
    marginTop: 4,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text.dark,
    letterSpacing: -0.4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F4F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginVertical: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F2',
  },
  flag: {
    fontSize: 22,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text.dark,
  },
  nameSelected: {
    fontFamily: fonts.bold,
  },
  dial: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
  },
  dialSelected: {
    color: colors.text.dark,
    fontFamily: fonts.bold,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
