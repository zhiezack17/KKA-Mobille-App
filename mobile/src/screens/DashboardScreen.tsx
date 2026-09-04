import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DashboardApi, RekapApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { APP_VERSION_LABEL } from '../version';
import { fmtIDR, fmtNum, fmtPercent } from '../utils/format';
import { Badge, Button, Card, ErrorView, Loading, Row, Screen, SectionTitle, StatCard } from '../components/ui';
import type { DashboardData, RekapData } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { user, signOut, token } = useAuth();
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [rekap, setRekap] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([DashboardApi.get(), RekapApi.get()]);
      setData(d);
      setRekap(r);
      setError('');
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat dashboard.');
    }
  }, [signOut]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        setLoading(true);
        fetchAll().finally(() => setLoading(false));
      }
    }, [token, fetchAll])
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <Loading text="Memuat dashboard..." />
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const year = new Date().getFullYear();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="light" />
      <Screen
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await fetchAll();
          setRefreshing(false);
        }}
      >
        <View style={styles.hero}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.white, flex: 1, flexShrink: 1 }}>
              Halo, {user?.nama ?? 'Auditor'} 👋
            </Text>
            <Button title="+ Buat Sesi" small variant="accent" onPress={() => navigation.navigate('SesiForm', {})} />
          </View>
          <Text style={{ color: '#A7F3D0', marginTop: 6, fontSize: 13 }}>
            {user?.jabatan ? `${user.jabatan} · ` : ''}Data sinkron dengan server KKA.
          </Text>
        </View>

        {error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              setLoading(true);
              fetchAll().finally(() => setLoading(false));
            }}
          />
        ) : null}

        {stats ? (
          <>
            <Row>
              <StatCard label="Total Sesi" value={fmtNum(stats.total_sesi)} sub={`${fmtNum(stats.sesi_tahun_ini)} di ${year}`} tone="emerald" />
              <StatCard label="Total Desa" value={fmtNum(stats.total_desa)} sub={`${fmtNum(stats.total_kecamatan)} kecamatan`} tone="blue" />
            </Row>
            <View style={{ height: spacing.md }} />
            <Row>
              <StatCard label="Total Pagu" value={fmtIDR(stats.total_anggaran)} tone="gold" />
              <StatCard
                label="Realisasi"
                value={fmtPercent(stats.persentase_realisasi)}
                sub={fmtIDR(stats.total_realisasi)}
                tone="teal"
              />
            </Row>
          </>
        ) : null}

        <SectionTitle>Sesi Terbaru</SectionTitle>
        {data?.recent_sesi?.length ? (
          data.recent_sesi.map((s) => (
            <Card
              key={s.id}
              onPress={() => navigation.navigate('SesiDetail', { id: s.id, title: s.objek_audit })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.text, flexShrink: 1, fontSize: 15 }}>{s.objek_audit}</Text>
                <Badge>{s.tahun_anggaran}</Badge>
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                {s.desa}
                {s.kecamatan ? ` · ${s.kecamatan}` : ''}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{s.bidang}</Text>
              {s.no_kka ? <Text style={{ color: colors.primary, fontSize: 12, marginTop: 6 }}>No. {s.no_kka}</Text> : null}
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Belum ada sesi audit.</Text>
          </Card>
        )}

        <SectionTitle>Rekap per Bidang</SectionTitle>
        {rekap?.per_bidang?.length ? (
          rekap.per_bidang.map((b) => (
            <Card key={b.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: colors.text, flexShrink: 1 }}>{b.bidang}</Text>
                <Badge>{b.jumlah_sesi} sesi</Badge>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Pagu: {fmtIDR(b.pagu)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Realisasi: {fmtIDR(b.realisasi)} ({fmtPercent(b.persentase_realisasi)})
              </Text>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Belum ada rekap.</Text>
          </Card>
        )}

        <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm }}>
          {APP_VERSION_LABEL}
        </Text>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDarker,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
});
