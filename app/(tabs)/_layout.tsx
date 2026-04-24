import { colors } from '@/src/theme/colors';
import { Tabs } from 'expo-router';
import { CallBell, House, Receipt, ShoppingBag } from 'phosphor-react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.background.light,
          borderTopColor: '#E5E5E5',
          height: 65,
          paddingBottom: 10,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Helvetica-Bold',
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
            <House size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="travelshop"
        options={{
          title: 'Travelshop',
          tabBarIcon: ({ color, focused }) => (
            <ShoppingBag size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="statement"
        options={{
          title: 'Extrato',
          tabBarIcon: ({ color, focused }) => (
            <Receipt size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, focused }) => (
            <CallBell size={26} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
    </Tabs>
  );
}