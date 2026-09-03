import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { LampiranApi, RincianApi, SesiApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { fmtBytes, fmtDate, fmtDateTime, fmtIDR, toNum } from '../utils/format';
import { Badge, Button, Card, ErrorView, InfoRow, Input, Loading, Row, Screen, SectionTitle } from '../components/ui';
import type { Rincian, SesiDetail } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SesiDetail'>;

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export default function SesiDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const sesiId = route.params.id;
  const { signOut, token } = useAuth();

  const [detail, setDetail] = useState<SesiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showRincianForm, setShowRincianForm] = useState(false);
  const [editingRincian, setEditingRincian] = useState<Rincian | null>(null);
  const [savingRincian, setSavingRincian] = useState(false);

  // form rincian
  const [rUraian, setRUraian] = useState('');
  const [rPagu, setRPagu] = useState('');
  const [rDikwitansi, setRDikwitansi] = useState('');
  const [rRealisasi, setRRealisasi] = useState('');
  const [rPenerima, setRPenerima] = useState('');
  const [rKeterangan, setRKeterangan] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await SesiApi.detail(sesiId);
      setDetail(d);
      setError('');
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat detail sesi.');
    } finally {
      setLoading(false);
    }
  }, [sesiId, token, signOut]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  useEffect(() => {
    navigation.setOptions({ title: detail?.sesi?.objek_audit ?? route.params.title ?? 'Detail Sesi' });
  }, [detail, navigation, route.params.title]);

  function resetRincianForm() {
    setRUraian('');
    setRPagu('');
    setRDikwitansi('');
    setRRealisasi('');
    setRPenerima('');
    setRKeterangan('');
    setEditingRincian(null);
  }

  function openNewRincian() {
    resetRincianForm();
    setShowRincianForm(true);
  }

  function openEditRincian(r: Rincian) {
    setEditingRincian(r);
    setRUraian(r.uraian ?? '');
    setRPagu(String(toNum(r.pagu_anggaran) || ''));
    setRDikwitansi(String(toNum(r.biaya_dikwitansi) || ''));
    setRRealisasi(String(toNum(r.realisasi) || ''));
    setRPenerima(r.penerima ?? '');
    setRKeterangan(r.keterangan ?? '');
    setShowRincianForm(true);
  }

  async function handleSaveRincian() {
    if (!detail) return;
    if (!rUraian.trim()) {
      Alert.alert('Validasi', 'Uraian wajib diisi.');
      return;
    }
    setSavingRincian(true);
    try {
      const payload = {
        urutan: editingRincian?.urutan ?? (detail.rincian.length + 1),
        uraian: rUraian.trim(),
        pagu_anggaran: toNum(rPagu),
        biaya_dikwitansi: toNum(rDikwitansi),
        realisasi: toNum(rRealisasi),
        penerima: rPenerima.trim() || null,
        keterangan: rKeterangan.trim() || null,
      };
      if (editingRincian) {
        await RincianApi.update(editingRincian.id, payload);
      } else {
        await RincianApi.create(sesiId, payload);
      }
      setShowRincianForm(false);
      resetRincianForm();
      await load();
    } catch (e) {
      Alert.alert('Gagal menyimpan rincian', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setSavingRincian(false);
    }
  }

  function confirmDeleteRincian(r: Rincian) {
    Alert.alert('Hapus rincian', `Hapus "${r.uraian}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await RincianApi.remove(r.id);
            await load();
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(true);
      await LampiranApi.upload(sesiId, { uri: asset.uri, name: asset.name, type: asset.mimeType ?? '' }, asset.name);
      await load();
    } catch (e) {
      Alert.alert('Gagal mengunggah', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setUploading(false);
    }
  }

  function confirmDeleteLampiran(id: number, name: string) {
    Alert.alert('Hapus lampiran', `Hapus "${name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await LampiranApi.remove(id);
            await load();
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  function confirmDeleteSesi() {
    Alert.alert('Hapus Sesi Audit', 'Seluruh rincian & lampiran sesi ini akan ikut terhapus. Lanjutkan?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus Sesi',
        style: 'destructive',
        onPress: async () => {
          try {
            await SesiApi.remove(sesiId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Gagal menghapus sesi', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  if (loading && !detail) return <Loading text="Memuat detail sesi..." />;
  if (!detail) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  const { sesi, rincian, lampiran, shared_with: shared } = detail;
  const totals = detail.totals;
  const totalSelisih = toNum(totals.dikwitansi) - toNum(totals.realisasi);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Screen refreshing={loading} onRefresh={load}>
        {/* Identitas */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{sesi.objek_audit}</Text>
            <Badge>{sesi.tahun_anggaran}</Badge>
          </View>
          {sesi.kegiatan ? (
            <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>{sesi.kegiatan}</Text>
          ) : null}
          <InfoRow label="Desa" value={sesi.desa_nama ?? sesi.desa} bold />
          <InfoRow label="Kecamatan" value={sesi.kecamatan_nama ?? sesi.kecamatan} />
          <InfoRow label="Bidang" value={sesi.bidang_nama ?? sesi.bidang} />
          <InfoRow label="Sub Bidang" value={sesi.sub_bidang_nama ?? sesi.sub_bidang} />
          <InfoRow label="No. KKA" value={sesi.no_kka} />
          <InfoRow label="Ref. PKA" value={sesi.ref_kka} />
          <InfoRow label="Semester" value={sesi.semester ? `Semester ${sesi.semester}` : '-'} />
          <InfoRow label="Pagu Anggaran" value={fmtIDR(sesi.pagu_anggaran)} bold />
          <InfoRow label="Disusun oleh" value={sesi.dibuat_oleh} />
          <InfoRow label="Tanggal Disusun" value={fmtDate(sesi.tanggal_dibuat)} />
          <InfoRow label="Direview oleh" value={sesi.direview_oleh} />
          <InfoRow label="Tanggal Review" value={fmtDate(sesi.tanggal_review)} />
          {sesi.kesimpulan ? <InfoRow label="Kesimpulan" value={sesi.kesimpulan} /> : null}
          {sesi.sumber_data ? <InfoRow label="Sumber Data" value={sesi.sumber_data} /> : null}
          <InfoRow label="Dibuat oleh" value={sesi.creator_nama} />
          <InfoRow label="Diperbarui" value={fmtDateTime(sesi.updated_at ?? sesi.created_at)} />
        </Card>

        {/* Ringkasan */}
        <SectionTitle>Ringkasan Keuangan</SectionTitle>
        <Row>
          <MiniStat label="Pagu" value={fmtIDR(totals.pagu)} />
          <MiniStat label="Dikwitansi" value={fmtIDR(totals.dikwitansi)} />
        </Row>
        <View style={{ height: spacing.md }} />
        <Row>
          <MiniStat label="Realisasi" value={fmtIDR(totals.realisasi)} color={colors.success} />
          <MiniStat
            label="Selisih (D−R)"
            value={fmtIDR(totalSelisih)}
            color={totalSelisih >= 0 ? colors.success : colors.danger}
          />
        </Row>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: spacing.xs }}>
          Persentase realisasi: {toNum(totals.persentase_realisasi).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
        </Text>

        {/* Rincian */}
        <SectionTitle>Rincian Belanja ({rincian.length})</SectionTitle>
        {rincian.length ? (
          rincian.map((r, i) => {
            const selisih = toNum(r.biaya_dikwitansi) - toNum(r.realisasi);
            return (
              <Card key={r.id} style={{ paddingVertical: spacing.md }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {r.urutan ?? i + 1}. {r.uraian}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Pagu: {fmtIDR(r.pagu_anggaran)}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Dikwitansi: {fmtIDR(r.biaya_dikwitansi)}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Realisasi: {fmtIDR(r.realisasi)}</Text>
                <Text style={{ color: selisih >= 0 ? colors.success : colors.danger, fontSize: 12, fontWeight: '700' }}>
                  Selisih (D−R): {fmtIDR(selisih)}
                </Text>
                {r.penerima ? <Text style={{ color: colors.muted, fontSize: 12 }}>Penerima: {r.penerima}</Text> : null}
                {r.keterangan ? <Text style={{ color: colors.muted, fontSize: 12 }}>{r.keterangan}</Text> : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <SmallAction label="Edit" onPress={() => openEditRincian(r)} />
                  <SmallAction label="Hapus" danger onPress={() => confirmDeleteRincian(r)} />
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Belum ada rincian belanja.</Text>
          </Card>
        )}
        <Button title="+ Tambah Rincian" variant="outline" onPress={openNewRincian} />

        {/* Lampiran */}
        <SectionTitle>Lampiran ({lampiran.length})</SectionTitle>
        {lampiran.length ? (
          lampiran.map((l) => (
            <Card key={l.id} style={{ paddingVertical: spacing.md }}>
              <TouchableOpacity
                onPress={() => {
                  if (l.file_url) {
                    Linking.openURL(l.file_url).catch(() => Alert.alert('Gagal membuka', 'URL lampiran tidak dapat dibuka.'));
                  } else {
                    Alert.alert('Info', 'URL lampiran tidak tersedia dari server.');
                  }
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.primary }}>📎 {l.nama_asli}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  {fmtBytes(l.ukuran)} · {fmtDateTime(l.created_at)}
                </Text>
                {l.uploader_nama ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Diunggah oleh {l.uploader_nama}</Text>
                ) : null}
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <SmallAction label="Hapus" danger onPress={() => confirmDeleteLampiran(l.id, l.nama_asli)} />
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Belum ada lampiran.</Text>
          </Card>
        )}
        <Button title={uploading ? 'Mengunggah...' : '+ Unggah Lampiran'} onPress={handleUpload} loading={uploading} disabled={uploading} />

        {/* Dibagikan */}
        {shared.length ? (
          <>
            <SectionTitle>Dibagikan kepada</SectionTitle>
            <Card>
              {shared.map((u) => (
                <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{u.nama}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{u.jabatan ?? ''}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionTitle>Aksi</SectionTitle>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
          <Button title="Edit Sesi" variant="outline" onPress={() => navigation.navigate('SesiForm', { id: sesiId })} style={{ flexGrow: 1 }} />
          <Button title="Master KKA" variant="outline" onPress={() => navigation.navigate('MasterKkaForm', { sesiId })} style={{ flexGrow: 1 }} />
          <Button title="Hapus Sesi" variant="danger" onPress={confirmDeleteSesi} style={{ flexGrow: 1 }} />
        </View>
      </Screen>

      {/* Modal Form Rincian */}
      {showRincianForm ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.md }}>
              {editingRincian ? 'Edit Rincian' : 'Tambah Rincian'}
            </Text>
            <Input label="Uraian *" value={rUraian} onChangeText={setRUraian} />
            <Input label="Pagu Anggaran (Rp)" value={rPagu} onChangeText={setRPagu} keyboardType="numeric" />
            <Input label="Biaya Dikwitansi (Rp)" value={rDikwitansi} onChangeText={setRDikwitansi} keyboardType="numeric" />
            <Input label="Realisasi (Rp)" value={rRealisasi} onChangeText={setRRealisasi} keyboardType="numeric" />
            <Input label="Penerima" value={rPenerima} onChangeText={setRPenerima} />
            <Input label="Keterangan" value={rKeterangan} onChangeText={setRKeterangan} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button title="Batal" variant="ghost" onPress={() => { setShowRincianForm(false); resetRincianForm(); }} style={{ flex: 1 }} />
              <Button title="Simpan" onPress={handleSaveRincian} loading={savingRincian} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MiniStat({ label, value, color = colors.primary }: { label: string; value: string; color?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color, fontSize: 14, fontWeight: '800', marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function SmallAction({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={{ color: danger ? colors.danger : colors.primary, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
  modalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end' as const,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
};
