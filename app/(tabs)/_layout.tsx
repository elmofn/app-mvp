import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';
import { Tabs } from 'expo-router';
import { CoinsIcon, HouseIcon, QuestionMarkIcon, SuitcaseRollingIcon } from 'phosphor-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background.light,
          borderTopColor: '#E5E5E5',
          height: 42 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 0,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bold,
          fontSize: 10,
          textTransform: 'uppercase',
          paddingBottom: 10,
          marginTop: 0,
        },
      }}>
      
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HouseIcon size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="travelshop"
        options={{
          title: 'Travelshop',
          tabBarIcon: ({ color, focused }) => (
            <SuitcaseRollingIcon size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="statement"
        options={{
          title: 'Extrato',
          tabBarIcon: ({ color, focused }) => (
            <CoinsIcon size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="support"
        options={{
          title: 'Ajuda',
          tabBarIcon: ({ color, focused }) => (
            <QuestionMarkIcon size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
    </Tabs>
  );
}