import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SesiListScreen from '../screens/SesiListScreen';
import SesiDetailScreen from '../screens/SesiDetailScreen';
import SesiFormScreen from '../screens/SesiFormScreen';
import RekapScreen from '../screens/RekapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { ApiUser } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  SesiDetail: { id: number; title?: string };
  SesiForm: { id?: number } | undefined;
};

export type MainTabParamList = {
  Beranda: undefined;
  Sesi: undefined;
  Rekap: undefined;
  Profil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Beranda"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <TabBarIcon name="home" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Sesi"
        component={SesiListScreen}
        options={{ tabBarIcon: ({ color, size }) => <TabBarIcon name="document-text" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Rekap"
        component={RekapScreen}
        options={{ tabBarIcon: ({ color, size }) => <TabBarIcon name="stats-chart" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <TabBarIcon name="person" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token, user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="SesiDetail"
            component={SesiDetailScreen}
            options={({ route }) => ({ title: route.params?.title ?? 'Detail Sesi' })}
          />
          <Stack.Screen
            name="SesiForm"
            component={SesiFormScreen}
            options={({ route }) => ({ title: route.params?.id ? 'Edit Sesi' : 'Buat Sesi Baru' })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
