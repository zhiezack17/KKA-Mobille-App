import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme';
import { Card, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AdminHomeScreen() {
  const navigation = useNavigation<Nav>();

  const menus = [
    {
      title: 'Manajemen Desa',
      desc: 'Tambah / ubah / hapus kecamatan & desa/kepenghuluan',
      icon: '🏘️',
      action: () => navigation.navigate('DesaManagement'),
    },
    {
      title: 'Master KKA',
      desc: 'KKP Standar, KKA Fisik (pengukuran), & KKA Sketsa/Foto',
      icon: '📋',
      action: () => navigation.navigate('MasterKkaList'),
    },
    {
      title: 'Manajemen Pengguna',
      desc: 'Tambah / ubah / nonaktifkan akun auditor & admin',
      icon: '👥',
      action: () => navigation.navigate('UserManagement'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="light" />
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Administrasi</Text>
        <Text style={{ color: colors.muted, marginBottom: spacing.lg }}>
          Menu khusus Administrator, sinkron dengan web KKA.
        </Text>

        {menus.map((m) => (
          <Card key={m.title} onPress={m.action} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontSize: 28 }}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>{m.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{m.desc}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 18 }}>›</Text>
          </Card>
        ))}
      </Screen>
    </SafeAreaView>
  );
}
