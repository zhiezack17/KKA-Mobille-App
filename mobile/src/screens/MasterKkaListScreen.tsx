import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { MasterKkaApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { fmtDateTime } from '../utils/format';
import { Badge, Card, EmptyView, ErrorView } from '../components/ui';
import type { MasterKka, MasterKkaTipe } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TIPE_LABEL: Record<MasterKkaTipe, string> = {
  standar: 'KKP Standar',
  fisik: 'KKA Fisik',
  sketsa: 'KKA Sketsa/Foto',
};

const TIPE_COLOR: Record<MasterKkaTipe, string> = {
  standar: colors.primary,
  fisik: colors.success,
  sketsa: colors.warning,
};

export default function MasterKkaListScreen() {
  const { signOut, token } = useAuth();
  const navigation = useNavigation<Nav>();
  const [tipe, setTipe] = useState<'' | MasterKkaTipe>('');
  const [items, setItems] = useState<MasterKka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await MasterKkaApi.list({ tipe: tipe || undefined });
      setItems(data);
      setError('');
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat Master KKA.');
    } finally {
      setLoading(false);
    }
  }, [tipe, token, signOut]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm, flexWrap: 'wrap' }}>
        {([['', 'Semua'], ['standar', 'Standar'], ['fisik', 'Fisik'], ['sketsa', 'Sketsa']] as const).map(([v, label]) => (
          <TouchableOpacity
            key={v}
            onPress={() => setTipe(v)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: tipe === v ? colors.primary : colors.card,
              borderWidth: 1,
              borderColor: tipe === v ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: tipe === v ? colors.white : colors.muted, fontWeight: '700', fontSize: 12 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ErrorView message={error} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} />
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          ListEmptyComponent={<EmptyView text="Belum ada dokumen Master KKA" />}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('MasterKkaDetail', { id: item.id, title: item.judul })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', color: colors.text, flexShrink: 1, fontSize: 15 }}>{item.judul}</Text>
                <Badge color={TIPE_COLOR[item.tipe]}>{TIPE_LABEL[item.tipe]}</Badge>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{item.objek_audit}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {item.desa} · {item.bidang}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <Badge>{item.jumlah_fisik ?? 0} baris fisik</Badge>
                <Badge color={colors.warning} bg={colors.warning + '1A'}>{item.jumlah_foto ?? 0} foto</Badge>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: spacing.sm }}>{fmtDateTime(item.created_at)}</Text>
            </Card>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('MasterKkaForm', {})}
        style={{
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.xl,
          backgroundColor: colors.primary,
          width: 58,
          height: 58,
          borderRadius: 29,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
        }}
      >
        <Text style={{ color: colors.white, fontSize: 30, lineHeight: 34 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
