import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { MasterKkaApi, SesiApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { toNum } from '../utils/format';
import { Button, Card, Input, Loading, Screen, SelectModal } from '../components/ui';
import type { MasterFisikRow, MasterKkaTipe, Sesi } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MasterKkaForm'>;

const TIPE_LABEL: Record<MasterKkaTipe, string> = {
  standar: 'KKP Standar (Narasi)',
  fisik: 'KKA Fisik (Pengukuran)',
  sketsa: 'KKA Sketsa / Foto',
};

function volume(row: MasterFisikRow): number {
  const jarak = toNum(row.jarak);
  if (jarak <= 0) return 0;
  return ((toNum(row.lebar_i) + toNum(row.lebar_ii)) / 2) * jarak * toNum(row.tebal);
}

export default function MasterKkaFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.id;
  const { signOut, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSesiPicker, setShowSesiPicker] = useState(false);

  const [sesiList, setSesiList] = useState<Sesi[]>([]);
  const [sesiId, setSesiId] = useState<number | null>(route.params?.sesiId ?? null);
  const [tipe, setTipe] = useState<MasterKkaTipe>('standar');
  const [judul, setJudul] = useState('');
  const [noKka, setNoKka] = useState('');
  const [refPka, setRefPka] = useState('');
  const [tanggalDok, setTanggalDok] = useState('');
  const [pendamping, setPendamping] = useState('');
  const [ketuaTim, setKetuaTim] = useState('');
  const [pendampingNip, setPendampingNip] = useState('');
  const [ketuaTimNip, setKetuaTimNip] = useState('');
  const [narasi, setNarasi] = useState('');
  const [fisik, setFisik] = useState<MasterFisikRow[]>([]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const list = await SesiApi.list({ per_page: 100 });
        setSesiList(list.data);
        if (editId) {
          const d = await MasterKkaApi.detail(editId);
          setSesiId(d.sesi_id);
          setTipe(d.tipe);
          setJudul(d.judul ?? '');
          setNoKka(d.no_kka ?? '');
          setRefPka(d.ref_pka ?? '');
          setTanggalDok(d.tanggal_dok ?? '');
          setPendamping(d.pendamping ?? '');
          setKetuaTim(d.ketua_tim ?? '');
          setPendampingNip(d.pendamping_nip ?? '');
          setKetuaTimNip(d.ketua_tim_nip ?? '');
          setNarasi(d.narasi ?? '');
          setFisik(d.fisik?.map((r) => ({ ...r })) ?? []);
        } else if (route.params?.sesiId && !sesiId) {
          setSesiId(route.params.sesiId);
        }
      } catch (e) {
        if (isUnauthorized(e)) {
          await signOut();
          return;
        }
        setError(e instanceof Error ? e.message : 'Gagal memuat data.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, token]);

  const sesiOptions = useMemo(
    () =>
      sesiList.map((s) => ({
        label: `${s.objek_audit} — ${s.desa ?? ''} (${s.tahun_anggaran})`,
        value: s.id,
      })),
    [sesiList]
  );

  function addRow() {
    setFisik((prev) => [...prev, { sta: '', jarak: '', lebar1: '', lebar2: '', tebal: '', keterangan: '' }]);
  }

  function updateRow(index: number, field: keyof MasterFisikRow, value: string) {
    setFisik((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeRow(index: number) {
    setFisik((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError('');
    if (!sesiId || !judul.trim()) {
      setError('Sesi Audit dan Judul wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sesi_id: sesiId,
        tipe,
        judul: judul.trim(),
        no_kka: noKka.trim() || null,
        ref_pka: refPka.trim() || null,
        tanggal_dok: tanggalDok.trim() || null,
        pendamping: pendamping.trim() || null,
        ketua_tim: ketuaTim.trim() || null,
        pendamping_nip: pendampingNip.trim() || null,
        ketua_tim_nip: ketuaTimNip.trim() || null,
        narasi: tipe === 'standar' ? narasi.trim() || null : null,
        fisik: tipe === 'fisik' ? fisik : undefined,
      };
      if (editId) {
        await MasterKkaApi.update(editId, payload);
      } else {
        await MasterKkaApi.create(payload as never);
      }
      navigation.goBack();
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal menyimpan Master KKA.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Memuat Master KKA..." />;

  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: spacing.sm }}>Dokumen Master KKA</Text>
        <TouchableOpacity onPress={() => setShowSesiPicker(true)} style={fieldStyle}>
          <Text style={{ color: sesiId ? colors.text : colors.muted, fontSize: 15 }}>
            {sesiId ? sesiList.find((s) => s.id === sesiId)?.objek_audit ?? `Sesi #${sesiId}` : 'Pilih Sesi Audit *'} ▾
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: spacing.md }}>Tipe Dokumen</Text>
        <View style={{ gap: spacing.sm }}>
          {(Object.keys(TIPE_LABEL) as MasterKkaTipe[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTipe(t)}
              style={{
                paddingVertical: 11,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: tipe === t ? colors.primary : colors.border,
                backgroundColor: tipe === t ? colors.primaryLight : colors.white,
              }}
            >
              <Text style={{ color: tipe === t ? colors.primary : colors.text, fontWeight: '700', fontSize: 14 }}>
                {TIPE_LABEL[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: spacing.md }} />
        <Input label="Judul Dokumen *" value={judul} onChangeText={setJudul} placeholder="Contoh: KKA Fisik Jalan... (boleh sama dengan objek)" />
        <Input label="No. KKA" value={noKka} onChangeText={setNoKka} />
        <Input label="Ref. PKA" value={refPka} onChangeText={setRefPka} />
        <Input label="Tanggal Dokumen (YYYY-MM-DD)" value={tanggalDok} onChangeText={setTanggalDok} placeholder="2026-09-03" />
        <Input label="Pendamping" value={pendamping} onChangeText={setPendamping} />
        <Input label="NIP Pendamping" value={pendampingNip} onChangeText={setPendampingNip} />
        <Input label="Ketua Tim" value={ketuaTim} onChangeText={setKetuaTim} />
        <Input label="NIP Ketua Tim" value={ketuaTimNip} onChangeText={setKetuaTimNip} />

        {tipe === 'standar' ? (
          <Input
            label="Narasi Audit"
            value={narasi}
            onChangeText={setNarasi}
            multiline
            numberOfLines={6}
            style={{ minHeight: 130, textAlignVertical: 'top' }}
          />
        ) : null}
      </Card>

      {tipe === 'fisik' ? (
        <Card>
          <Text style={{ fontWeight: '800', fontSize: 15 }}>Tabel Pengukuran</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: spacing.sm }}>
            Volume otomatis = ((Lebar I + Lebar II) / 2) × Jarak × Tebal
          </Text>
          {fisik.map((row, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Input label="STA" value={String(row.sta ?? '')} onChangeText={(v) => updateRow(i, 'sta', v)} style={{ flex: 1 }} />
              </View>
              <Input label="Jarak (m)" value={String(row.jarak ?? '')} onChangeText={(v) => updateRow(i, 'jarak', v)} keyboardType="decimal-pad" />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Input label="Lebar I (m)" value={String(row.lebar_i ?? '')} onChangeText={(v) => updateRow(i, 'lebar_i', v)} keyboardType="decimal-pad" style={{ flex: 1 }} />
                <Input label="Lebar II (m)" value={String(row.lebar_ii ?? '')} onChangeText={(v) => updateRow(i, 'lebar_ii', v)} keyboardType="decimal-pad" style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Input label="Tebal (m)" value={String(row.tebal ?? '')} onChangeText={(v) => updateRow(i, 'tebal', v)} keyboardType="decimal-pad" style={{ flex: 1 }} />
                <View style={{ flex: 1, marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Volume (m³)</Text>
                  <Text style={fieldStyle}>{volume(row) ? volume(row).toFixed(3) : '-'}</Text>
                </View>
              </View>
              <Input label="Keterangan" value={String(row.keterangan ?? '')} onChangeText={(v) => updateRow(i, 'keterangan', v)} />
              <Button title="Hapus Baris" variant="ghost" small onPress={() => removeRow(i)} />
            </View>
          ))}
          <Button title="+ Tambah Baris" variant="outline" small onPress={addRow} />
        </Card>
      ) : null}

      {tipe === 'sketsa' ? (
        <Card>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Dokumen sketsa/foto dibuat, lalu foto lapangan dapat ditambahkan dari halaman detail.
          </Text>
        </Card>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>{error}</Text> : null}
      <Button title={editId ? 'Simpan Perubahan' : 'Buat Master KKA'} onPress={handleSave} loading={saving} />
      <View style={{ height: spacing.xl }} />

      <SelectModal
        visible={showSesiPicker}
        title="Pilih Sesi Audit"
        options={sesiOptions}
        value={sesiId ?? undefined}
        onSelect={(v) => setSesiId(Number(v))}
        onClose={() => setShowSesiPicker(false)}
      />
    </Screen>
  );
}

const fieldStyle = {
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
} as const;
