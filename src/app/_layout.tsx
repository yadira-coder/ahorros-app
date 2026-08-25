import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import Head from 'expo-router/head';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SavingsProvider } from '@/context/SavingsContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <SavingsProvider>
      <Head>
        <title>Mis Ahorros y Huchas</title>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ahorros" />
        <link rel="apple-touch-icon" href="/ahorros-app/apple-touch-icon.png" />
        <link rel="manifest" href="/ahorros-app/manifest.json" />
      </Head>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.3)',
              height: 75,
              paddingBottom: 18,
              paddingTop: 8,
              paddingHorizontal: 4,
              elevation: 8,
              shadowColor: '#84a59d',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
            },
            tabBarItemStyle: {
              paddingHorizontal: 0,
              marginHorizontal: 0,
            },
            tabBarLabelStyle: {
              fontFamily: 'Inter',
              fontSize: 8.5,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.1,
              marginTop: -2,
            },
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Resumen',
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="dashboard" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="huchas"
            options={{
              title: 'Huchas',
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="savings" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="wishlist"
            options={{
              title: 'Deseos',
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="favorite" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="categories"
            options={{
              title: 'Categorías',
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="category" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: 'Reportes',
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="leaderboard" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Ajustes',
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="settings" size={20} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="+not-found"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="_sitemap"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </ThemeProvider>
    </SavingsProvider>
  );
}
