import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { MasterApi, SesiApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { toNum, todayInput } from '../utils/format';
import { Button, Card, Input, Loading, Screen, SelectModal } from '../components/ui';
import type { Bidang, Desa, Kecamatan, SubBidang } from '../types';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SesiForm'>;

export default function SesiFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.id;
  const { signOut, token } = useAuth();

  const [kecamatan, setKecamatan] = useState<Kecamatan[]>([]);
  const [bidang, setBidang] = useState<Bidang[]>([]);
  const [desa, setDesa] = useState<Desa[]>([]);
  const [sub, setSub] = useState<SubBidang[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);

  const [kecamatanId, setKecamatanId] = useState<number | null>(null);
  const [desaId, setDesaId] = useState<number | null>(null);
  const [bidangId, setBidangId] = useState<number | null>(null);
  const [subBidangId, setSubBidangId] = useState<number | null>(null);
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [semester, setSemester] = useState('1');
  const [objek, setObjek] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [pagu, setPagu] = useState('');
  const [noKka, setNoKka] = useState('');
  const [refKka, setRefKka] = useState('');
  const [dibuatOleh, setDibuatOleh] = useState('');
  const [tanggalDibuat, setTanggalDibuat] = useState(todayInput());
  const [direviewOleh, setDireviewOleh] = useState('');
  const [tanggalReview, setTanggalReview] = useState('');
  const [kesimpulan, setKesimpulan] = useState('');
  const [sumberData, setSumberData] = useState('');

  const [picker, setPicker] = useState<'kecamatan' | 'desa' | 'bidang' | 'sub' | 'semester' | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const [kec, bid] = await Promise.all([MasterApi.kecamatan(), MasterApi.bidang()]);
        setKecamatan(kec);
        setBidang(bid);
        if (editId) {
          const detail = await SesiApi.detail(editId);
          const s = detail.sesi;
          setObjek(s.objek_audit ?? '');
          setKegiatan(s.kegiatan ?? '');
          setPagu(String(toNum(s.pagu_anggaran) || ''));
          setTahun(String(s.tahun_anggaran ?? new Date().getFullYear()));
          setSemester(String(s.semester ?? 1));
          setNoKka(s.no_kka ?? '');
          setRefKka(s.ref_kka ?? '');
          setDibuatOleh(s.dibuat_oleh ?? '');
          setTanggalDibuat(s.tanggal_dibuat ?? '');
          setDireviewOleh(s.direview_oleh ?? '');
          setTanggalReview(s.tanggal_review ?? '');
          setKesimpulan(s.kesimpulan ?? '');
          setSumberData(s.sumber_data ?? '');
          setBidangId(s.bidang_id);
          setSubBidangId(s.sub_bidang_id ?? null);
          setDesaId(s.desa_id);
          // cari kecamatan dari data desa
          const allDesa = await MasterApi.desa();
          const match = allDesa.find((d) => d.id === s.desa_id);
          if (match?.kecamatan_id) setKecamatanId(match.kecamatan_id);
        }
      } catch (e) {
        if (isUnauthorized(e)) {
          await signOut();
          return;
        }
        setError(e instanceof Error ? e.message : 'Gagal memuat data master.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, token]);

  useEffect(() => {
    if (!kecamatanId) return;
    MasterApi.desa(kecamatanId)
      .then(setDesa)
      .catch(() => setDesa([]));
  }, [kecamatanId]);

  useEffect(() => {
    if (!bidangId) return;
    MasterApi.subBidang(bidangId)
      .then(setSub)
      .catch(() => setSub([]));
    setSubBidangId(null);
  }, [bidangId]);

  const desaOptions = useMemo(() => desa.map((d) => ({ label: d.nama, value: d.id })), [desa]);
  const kecamatanOptions = useMemo(() => kecamatan.map((k) => ({ label: k.nama, value: k.id })), [kecamatan]);
  const bidangOptions = useMemo(() => bidang.map((b) => ({ label: b.nama, value: b.id })), [bidang]);
  const subOptions = useMemo(() => sub.map((s) => ({ label: s.nama, value: s.id })), [sub]);
  const semesterOptions = [
    { label: 'Semester 1', value: 1 },
    { label: 'Semester 2', value: 2 },
  ];

  function selectedLabel<T extends { id: number; nama: string }>(list: T[], id: number | null): string {
    return list.find((x) => x.id === id)?.nama ?? 'Pilih...';
  }

  async function handleSave() {
    setError('');
    const tahunNum = parseInt(tahun, 10);
    if (!desaId || !bidangId || !objek.trim() || !tahunNum) {
      setError('Kecamatan, Desa, Bidang, Objek Audit, dan Tahun wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        desa_id: desaId,
        bidang_id: bidangId,
        sub_bidang_id: subBidangId,
        objek_audit: objek.trim(),
        kegiatan: kegiatan.trim() || null,
        pagu_anggaran: toNum(pagu),
        semester: parseInt(semester, 10),
        tahun_anggaran: tahunNum,
        no_kka: noKka.trim() || null,
        ref_kka: refKka.trim() || null,
        dibuat_oleh: dibuatOleh.trim() || null,
        tanggal_dibuat: tanggalDibuat.trim() || null,
        direview_oleh: direviewOleh.trim() || null,
        tanggal_review: tanggalReview.trim() || null,
        kesimpulan: kesimpulan.trim() || null,
        sumber_data: sumberData.trim() || null,
      };
      if (editId) {
        await SesiApi.update(editId, payload);
      } else {
        await SesiApi.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal menyimpan sesi.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Memuat data master..." />;

  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: spacing.sm }}>Identitas Sesi Audit</Text>
        <SelectField label="Kecamatan" value={selectedLabel(kecamatan, kecamatanId)} onPress={() => setPicker('kecamatan')} />
        <SelectField
          label="Desa / Kepenghuluan"
          value={kecamatanId ? selectedLabel(desa, desaId) : 'Pilih kecamatan dulu'}
          onPress={() => setPicker('desa')}
          disabled={!kecamatanId}
        />
        <SelectField label="Bidang" value={selectedLabel(bidang, bidangId)} onPress={() => setPicker('bidang')} />
        <SelectField
          label="Sub Bidang (opsional)"
          value={bidangId ? selectedLabel(sub, subBidangId) : 'Pilih bidang dulu'}
          onPress={() => setPicker('sub')}
          disabled={!bidangId}
        />
        <Input label="Tahun Anggaran" value={tahun} onChangeText={setTahun} keyboardType="number-pad" />
        <SelectField label="Semester" value={semester === '1' ? 'Semester 1' : 'Semester 2'} onPress={() => setPicker('semester')} />
        <Input label="Objek Audit *" value={objek} onChangeText={setObjek} placeholder="Contoh: Belanja honor kegiatan..." />
        <Input label="Kegiatan" value={kegiatan} onChangeText={setKegiatan} />
        <Input label="Pagu Anggaran (Rp)" value={pagu} onChangeText={setPagu} keyboardType="numeric" />
        <Input label="No. KKA" value={noKka} onChangeText={setNoKka} />
        <Input label="Ref. PKA" value={refKka} onChangeText={setRefKka} />
      </Card>

      <Text
        style={{ color: colors.primary, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.sm }}
        onPress={() => setShowMore((v) => !v)}
      >
        {showMore ? 'Sembunyikan informasi lanjutan ▲' : 'Tampilkan informasi lanjutan ▼'}
      </Text>

      {showMore ? (
        <Card>
          <Input label="Disusun oleh (Auditor)" value={dibuatOleh} onChangeText={setDibuatOleh} />
          <Input label="Tanggal Disusun (YYYY-MM-DD)" value={tanggalDibuat} onChangeText={setTanggalDibuat} />
          <Input label="Direview oleh (Ketua Tim)" value={direviewOleh} onChangeText={setDireviewOleh} />
          <Input label="Tanggal Review (YYYY-MM-DD)" value={tanggalReview} onChangeText={setTanggalReview} />
          <Input
            label="Kesimpulan Audit"
            value={kesimpulan}
            onChangeText={setKesimpulan}
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Input
            label="Sumber Data"
            value={sumberData}
            onChangeText={setSumberData}
            multiline
            numberOfLines={3}
            style={{ minHeight: 70, textAlignVertical: 'top' }}
          />
        </Card>
      ) : null}

      {error ? (
        <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>{error}</Text>
      ) : null}

      <Button title={editId ? 'Simpan Perubahan' : 'Buat Sesi'} onPress={handleSave} loading={saving} />

      <SelectModal
        visible={picker === 'kecamatan'}
        title="Pilih Kecamatan"
        options={kecamatanOptions}
        value={kecamatanId ?? undefined}
        onSelect={(v) => {
          setKecamatanId(Number(v));
          setDesaId(null);
        }}
        onClose={() => setPicker(null)}
      />
      <SelectModal
        visible={picker === 'desa'}
        title="Pilih Desa / Kepenghuluan"
        options={desaOptions}
        value={desaId ?? undefined}
        onSelect={(v) => setDesaId(Number(v))}
        onClose={() => setPicker(null)}
      />
      <SelectModal
        visible={picker === 'bidang'}
        title="Pilih Bidang"
        options={bidangOptions}
        value={bidangId ?? undefined}
        onSelect={(v) => setBidangId(Number(v))}
        onClose={() => setPicker(null)}
      />
      <SelectModal
        visible={picker === 'sub'}
        title="Pilih Sub Bidang"
        options={subOptions}
        value={subBidangId ?? undefined}
        onSelect={(v) => setSubBidangId(Number(v))}
        onClose={() => setPicker(null)}
      />
      <SelectModal
        visible={picker === 'semester'}
        title="Pilih Semester"
        options={semesterOptions}
        value={Number(semester)}
        onSelect={(v) => setSemester(String(v))}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

function SelectField({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{label}</Text>
      <Text
        onPress={disabled ? undefined : onPress}
        style={{
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: disabled ? colors.muted : colors.text,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {value} ▾
      </Text>
    </View>
  );
}
