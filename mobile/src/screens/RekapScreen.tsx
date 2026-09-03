import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RekapApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { fmtIDR, fmtNum, fmtPercent, toNum } from '../utils/format';
import { Badge, Card, ErrorView, Loading, Row, Screen, SectionTitle, StatCard } from '../components/ui';
import type { RekapData } from '../types';

const YEARS = () => {
  const now = new Date().getFullYear();
  const y: number[] = [];
  for (let i = now; i >= now - 4; i--) y.push(i);
  return y;
};

export default function RekapScreen() {
  const { signOut, token } = useAuth();
  const [tahun, setTahun] = useState(0);
  const [data, setData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (y: number) => {
      if (!token) return;
      try {
        const d = await RekapApi.get(y > 0 ? y : undefined);
        setData(d);
        setError('');
      } catch (e) {
        if (isUnauthorized(e)) {
          await signOut();
          return;
        }
        setError(e instanceof Error ? e.message : 'Gagal memuat rekap.');
      } finally {
        setLoading(false);
      }
    },
    [token, signOut]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(tahun);
    }, [tahun, load])
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <Loading text="Memuat rekap..." />
      </SafeAreaView>
    );
  }

  const r = data?.ringkasan;
  const totalSelisih = toNum(r?.total_realisasi) - toNum(r?.total_dikwitansi);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="light" />
      <Screen
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load(tahun);
          setRefreshing(false);
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Rekapitulasi</Text>
        <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>Data sinkron dengan server KKA.</Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
          <Chip label="Semua Tahun" active={tahun === 0} onPress={() => setTahun(0)} />
          {YEARS().map((y) => (
            <Chip key={y} label={String(y)} active={tahun === y} onPress={() => setTahun(y)} />
          ))}
        </View>

        {error ? <ErrorView message={error} onRetry={() => { setLoading(true); load(tahun); }} /> : null}

        {r ? (
          <>
            <Row>
              <StatCard label="Total Desa" value={fmtNum(r.total_desa)} />
              <StatCard label="Total Sesi" value={fmtNum(r.total_sesi)} color={colors.success} />
            </Row>
            <View style={{ height: spacing.md }} />
            <Row>
              <StatCard label="Total Pagu" value={fmtIDR(r.total_pagu)} color={colors.warning} />
              <StatCard
                label="Realisasi"
                value={fmtPercent(r.persentase_realisasi)}
                sub={fmtIDR(r.total_realisasi)}
                color={colors.success}
              />
            </Row>
            <View style={{ height: spacing.md }} />
            <Row>
              <StatCard label="Dikwitansi" value={fmtIDR(r.total_dikwitansi)} />
              <StatCard
                label="Selisih (R−D)"
                value={fmtIDR(totalSelisih)}
                color={totalSelisih >= 0 ? colors.success : colors.danger}
              />
            </Row>
          </>
        ) : null}

        <SectionTitle>Per Desa</SectionTitle>
        {data?.per_desa?.length ? (
          data.per_desa.map((d) => (
            <Card key={d.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.text, flexShrink: 1 }}>{d.desa}</Text>
                <Badge>{d.jumlah_sesi} sesi</Badge>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{d.kecamatan}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Pagu: {fmtIDR(d.pagu)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Realisasi: {fmtIDR(d.realisasi)} ({fmtPercent(d.persentase_realisasi)})</Text>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Belum ada data rekap per desa.</Text>
          </Card>
        )}

        <SectionTitle>Per Bidang</SectionTitle>
        {data?.per_bidang?.length ? (
          data.per_bidang.map((b) => (
            <Card key={b.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.text, flexShrink: 1 }}>{b.bidang}</Text>
                <Badge>{b.jumlah_sesi} sesi</Badge>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Pagu: {fmtIDR(b.pagu)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Realisasi: {fmtIDR(b.realisasi)} ({fmtPercent(b.persentase_realisasi)})</Text>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Belum ada data rekap per bidang.</Text>
          </Card>
        )}
      </Screen>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
