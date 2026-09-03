import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SesiApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { Badge, Card, EmptyView, ErrorView } from '../components/ui';
import type { Sesi, SesiListResponse } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const YEAR_OPTIONS = () => {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now; y >= now - 4; y--) years.push(y);
  return years;
};

export default function SesiListScreen() {
  const { signOut, token } = useAuth();
  const navigation = useNavigation<Nav>();

  const [q, setQ] = useState('');
  const [tahun, setTahun] = useState(0);
  const [items, setItems] = useState<Sesi[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (!token) return;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const res: SesiListResponse = await SesiApi.list({
          q: q.trim() || undefined,
          tahun: tahun > 0 ? tahun : undefined,
          page: targetPage,
          per_page: 20,
        });
        setItems((prev) => (replace ? res.data : [...prev, ...res.data]));
        setPage(res.pagination.page);
        setTotalPages(res.pagination.total_pages);
        setTotal(res.pagination.total);
        setError('');
      } catch (e) {
        if (isUnauthorized(e)) {
          await signOut();
          return;
        }
        setError(e instanceof Error ? e.message : 'Gagal memuat sesi.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q, tahun, token, signOut]
  );

  useEffect(() => {
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, token]);

  useFocusEffect(
    useCallback(() => {
      fetchPage(1, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function onChangeSearch(text: string) {
    setQ(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPage(1, true), 450);
  }

  function loadMore() {
    if (loading || loadingMore || page >= totalPages) return;
    fetchPage(page + 1, false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="light" />
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Sesi Audit</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: spacing.md }}>
          {total} sesi ditemukan
        </Text>
        <TextInput
          value={q}
          onChangeText={onChangeSearch}
          placeholder="Cari objek audit / no. KKA..."
          placeholderTextColor={colors.muted}
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 15,
            color: colors.text,
          }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          <FilterChip label="Semua" active={tahun === 0} onPress={() => setTahun(0)} />
          {YEAR_OPTIONS().map((y) => (
            <FilterChip key={y} label={String(y)} active={tahun === y} onPress={() => setTahun(y)} />
          ))}
        </View>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ErrorView message={error} onRetry={() => fetchPage(1, true)} />
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListEmptyComponent={<EmptyView text="Belum ada sesi audit untuk filter ini" />}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('SesiDetail', { id: item.id, title: item.objek_audit })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.text, flexShrink: 1, fontSize: 15 }}>
                  {item.objek_audit}
                </Text>
                <Badge>{item.tahun_anggaran}</Badge>
              </View>
              {item.desa ? (
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                  {item.desa}
                  {item.kecamatan ? ` · ${item.kecamatan}` : ''}
                </Text>
              ) : null}
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {item.bidang}
                {item.sub_bidang ? ` › ${item.sub_bidang}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <Badge color={colors.success} bg={colors.success + '1A'}>
                  {item.jumlah_rincian ?? 0} rincian
                </Badge>
                <Badge color={colors.warning} bg={colors.warning + '1A'}>
                  {item.jumlah_lampiran ?? 0} lampiran
                </Badge>
              </View>
            </Card>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('SesiForm', {})}
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
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <Text style={{ color: colors.white, fontSize: 30, lineHeight: 34 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.white : colors.muted, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}
