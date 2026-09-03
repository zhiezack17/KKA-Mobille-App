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
import AdminHomeScreen from '../screens/AdminHomeScreen';
import DesaManagementScreen from '../screens/DesaManagementScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import MasterKkaListScreen from '../screens/MasterKkaListScreen';
import MasterKkaFormScreen from '../screens/MasterKkaFormScreen';
import MasterKkaDetailScreen from '../screens/MasterKkaDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  SesiDetail: { id: number; title?: string };
  SesiForm: { id?: number } | undefined;
  AdminMenu: undefined;
  DesaManagement: undefined;
  UserManagement: undefined;
  MasterKkaList: undefined;
  MasterKkaForm: { id?: number; sesiId?: number } | undefined;
  MasterKkaDetail: { id: number; title?: string };
};

export type MainTabParamList = {
  Beranda: undefined;
  Sesi: undefined;
  Rekap: undefined;
  Admin: undefined;
  Profil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
      {isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminHomeScreen}
          options={{ tabBarIcon: ({ color, size }) => <TabBarIcon name="settings" color={color} size={size} /> }}
        />
      ) : null}
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <TabBarIcon name="person" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token } = useAuth();

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
          <Stack.Screen name="AdminMenu" component={AdminHomeScreen} options={{ title: 'Administrasi' }} />
          <Stack.Screen name="DesaManagement" component={DesaManagementScreen} options={{ title: 'Manajemen Desa' }} />
          <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Manajemen Pengguna' }} />
          <Stack.Screen name="MasterKkaList" component={MasterKkaListScreen} options={{ title: 'Master KKA' }} />
          <Stack.Screen
            name="MasterKkaForm"
            component={MasterKkaFormScreen}
            options={({ route }) => ({ title: route.params?.id ? 'Edit Master KKA' : 'Buat Master KKA' })}
          />
          <Stack.Screen
            name="MasterKkaDetail"
            component={MasterKkaDetailScreen}
            options={({ route }) => ({ title: route.params?.title ?? 'Detail Master KKA' })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
