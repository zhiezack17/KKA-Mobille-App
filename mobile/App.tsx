import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation';
import { Loading } from './src/components/ui';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

function Gate() {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <>
        <StatusBar style="dark" />
        <Loading text="Mempersiapkan KKA Mobile..." />
      </>
    );
  }
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
