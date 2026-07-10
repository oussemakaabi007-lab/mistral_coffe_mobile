import { Colors } from '@/constants/theme';
import * as NavigationBar from 'expo-navigation-bar';
import { Tabs } from 'expo-router';
import { LayoutDashboard, LogOut, ReceiptText } from 'lucide-react-native';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="DailySales"
        options={{
          title: 'Ventes',
          tabBarIcon: ({ color }) => <ReceiptText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Logout"
        options={{
          title: 'fermer la session',
          tabBarIcon: ({ color }) => <LogOut size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}