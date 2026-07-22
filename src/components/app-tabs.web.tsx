import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

function CustomWebTabBar({ state, descriptors, navigation }: any) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName = 'help-outline';
        if (route.name === 'index') iconName = 'dashboard';
        if (route.name === 'huchas') iconName = 'savings';
        if (route.name === 'categories') iconName = 'category';
        if (route.name === 'reports') iconName = 'leaderboard';
        if (route.name === 'settings') iconName = 'settings';

        const color = isFocused ? colors.primary : colors.textSecondary;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <MaterialIcons name={iconName as any} size={22} color={color} />
            <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomWebTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Resumen' }} />
      <Tabs.Screen name="huchas" options={{ title: 'Huchas' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categorías' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reportes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    position: 'fixed' as any,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 70,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 999999,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
});
