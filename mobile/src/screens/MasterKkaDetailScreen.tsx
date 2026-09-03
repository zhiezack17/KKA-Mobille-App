import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MasterKkaApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { fmtBytes, fmtDateTime, toNum } from '../utils/format';
import { Badge, Button, Card, EmptyView, ErrorView, InfoRow, Loading, Screen, SectionTitle } from '../components/ui';
import type { MasterKkaDetail, MasterKkaTipe } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MasterKkaDetail'>;

const TIPE_LABEL: Record<MasterKkaTipe, string> = {
  standar: 'KKP Standar',
  fisik: 'KKA Fisik',
  sketsa: 'KKA Sketsa/Foto',
};

export default function MasterKkaDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const id = route.params.id;
  const { signOut, token } = useAuth();

  const [detail, setDetail] = useState<MasterKkaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await MasterKkaApi.detail(id);
      setDetail(d);
      setError('');
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat detail Master KKA.');
    } finally {
      setLoading(false);
    }
  }, [id, token, signOut]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  useEffect(() => {
    navigation.setOptions({ title: detail?.judul ?? route.params.title ?? 'Detail Master KKA' });
  }, [detail, navigation, route.params.title]);

  async function uploadFoto() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(true);
      await MasterKkaApi.uploadFoto(id, { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' });
      await load();
    } catch (e) {
      Alert.alert('Gagal mengunggah foto', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setUploading(false);
    }
  }

  function confirmDeleteFoto(fotoId: number, name: string) {
    Alert.alert('Hapus foto', `Hapus "${name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await MasterKkaApi.removeFoto(id, fotoId);
            await load();
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  function confirmDeleteDoc() {
    Alert.alert('Hapus Master KKA', 'Dokumen beserta baris fisik & foto akan dihapus. Lanjutkan?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await MasterKkaApi.remove(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  if (loading && !detail) return <Loading text="Memuat Master KKA..." />;
  if (!detail) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  const d = detail;

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text, flexShrink: 1 }}>{d.judul}</Text>
          <Badge color={d.tipe === 'standar' ? colors.primary : d.tipe === 'fisik' ? colors.success : colors.warning}>
            {TIPE_LABEL[d.tipe]}
          </Badge>
        </View>
        <InfoRow label="Sesi Audit" value={d.sesi?.objek_audit} bold />
        <InfoRow label="No. KKA" value={d.sesi?.no_kka} />
        <InfoRow label="Tahun" value={d.sesi?.tahun_anggaran} />
        <InfoRow label="Dibuat" value={fmtDateTime(d.created_at)} />
      </Card>

      {d.tipe === 'standar' ? (
        <>
          <SectionTitle>Narasi Audit</SectionTitle>
          <Card>
            <Text style={{ color: colors.text, lineHeight: 22 }}>{d.narasi || 'Belum ada narasi.'}</Text>
          </Card>
        </>
      ) : null}

      {d.tipe === 'fisik' ? (
        <>
          <SectionTitle>Tabel Pengukuran ({d.fisik?.length ?? 0})</SectionTitle>
          <Card style={{ padding: spacing.sm }}>
            {d.fisik?.length ? (
              d.fisik.map((r, i) => (
                <View key={r.id ?? i} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {r.sta ? `STA ${r.sta}` : `Baris ${i + 1}`}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Jarak {toNum(r.jarak)} m · Lebar {toNum(r.lebar1)} / {toNum(r.lebar2)} m · Tebal {toNum(r.tebal)} m
                  </Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                    Volume: {toNum(r.volume).toFixed(3)} m³
                  </Text>
                  {r.keterangan ? <Text style={{ color: colors.muted, fontSize: 12 }}>{r.keterangan}</Text> : null}
                </View>
              ))
            ) : (
              <EmptyView text="Belum ada baris pengukuran" />
            )}
          </Card>
        </>
      ) : null}

      {d.tipe === 'sketsa' || d.foto?.length ? (
        <>
          <SectionTitle>Foto Lapangan ({d.foto?.length ?? 0})</SectionTitle>
          {d.foto?.length ? (
            d.foto.map((f) => (
              <Card key={f.id} style={{ paddingVertical: spacing.md }}>
                <TouchableOpacity
                  onPress={() => {
                    if (f.file_url) {
                      Linking.openURL(f.file_url).catch(() => Alert.alert('Gagal membuka', 'URL foto tidak dapat dibuka.'));
                    } else {
                      Alert.alert('Info', 'URL foto tidak tersedia dari server.');
                    }
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.primary }}>🖼️ {f.nama_asli ?? f.nama_file}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {fmtBytes(f.ukuran)} · {fmtDateTime(f.created_at)}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                  <TouchableOpacity onPress={() => confirmDeleteFoto(f.id, f.nama_asli ?? f.nama_file)}>
                    <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyView text="Belum ada foto" />
            </Card>
          )}
          <Button title={uploading ? 'Mengunggah...' : '+ Tambah Foto'} onPress={uploadFoto} loading={uploading} disabled={uploading} />
        </>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Button title="Edit" variant="outline" onPress={() => navigation.navigate('MasterKkaForm', { id })} style={{ flex: 1 }} />
        <Button title="Hapus" variant="danger" onPress={confirmDeleteDoc} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
