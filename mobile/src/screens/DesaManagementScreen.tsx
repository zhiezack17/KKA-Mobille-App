import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { MasterApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { Badge, Button, Card, EmptyView, ErrorView, Input, Loading, Screen, SelectModal } from '../components/ui';
import type { Desa, Kecamatan } from '../types';

export default function DesaManagementScreen() {
  const { signOut, token } = useAuth();
  const [kec, setKec] = useState<Kecamatan[]>([]);
  const [desa, setDesa] = useState<Desa[]>([]);
  const [kecId, setKecId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showKecPicker, setShowKecPicker] = useState(false);

  // modal tambah/ubah desa
  const [showDesaForm, setShowDesaForm] = useState(false);
  const [editDesa, setEditDesa] = useState<Desa | null>(null);
  const [desaNama, setDesaNama] = useState('');
  const [saving, setSaving] = useState(false);

  // modal tambah kecamatan
  const [showKecForm, setShowKecForm] = useState(false);
  const [kecNama, setKecNama] = useState('');

  const load = useCallback(
    async (targetKecId?: number) => {
      if (!token) return;
      try {
        const ks = await MasterApi.kecamatan();
        setKec(ks);
        const id = targetKecId ?? kecId ?? ks[0]?.id ?? null;
        setKecId(id);
        if (id) {
          const ds = await MasterApi.desa(id);
          setDesa(ds);
        } else {
          setDesa([]);
        }
        setError('');
      } catch (e) {
        if (isUnauthorized(e)) {
          await signOut();
          return;
        }
        setError(e instanceof Error ? e.message : 'Gagal memuat data desa.');
      } finally {
        setLoading(false);
      }
    },
    [token, kecId, signOut]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])
  );

  async function pickKec(id: number) {
    setKecId(id);
    setLoading(true);
    try {
      const ds = await MasterApi.desa(id);
      setDesa(ds);
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  function openAddDesa() {
    setEditDesa(null);
    setDesaNama('');
    setShowDesaForm(true);
  }

  function openEditDesa(d: Desa) {
    setEditDesa(d);
    setDesaNama(d.nama);
    setShowDesaForm(true);
  }

  async function saveDesa() {
    if (!desaNama.trim()) {
      Alert.alert('Validasi', 'Nama desa wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      if (editDesa && kecId) {
        await MasterApi.updateDesa(editDesa.id, kecId, desaNama.trim());
      } else if (kecId) {
        await MasterApi.createDesa(kecId, desaNama.trim());
      }
      setShowDesaForm(false);
      await pickKec(kecId!);
    } catch (e) {
      Alert.alert('Gagal menyimpan', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteDesa(d: Desa) {
    Alert.alert('Hapus Desa', `Hapus "${d.nama}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await MasterApi.removeDesa(d.id);
            await pickKec(kecId!);
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  async function saveKec() {
    if (!kecNama.trim()) {
      Alert.alert('Validasi', 'Nama kecamatan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const res = await MasterApi.createKecamatan(kecNama.trim());
      setShowKecForm(false);
      setKecNama('');
      await load(res.id);
    } catch (e) {
      Alert.alert('Gagal menyimpan kecamatan', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteKec() {
    if (!kecId) return;
    const k = kec.find((x) => x.id === kecId);
    Alert.alert('Hapus Kecamatan', `Hapus "${k?.nama}"? (hanya bisa bila tidak ada desa di dalamnya)`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await MasterApi.removeKecamatan(kecId);
            setKecId(null);
            await load();
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  if (loading) return <Loading text="Memuat data desa..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        {error ? <ErrorView message={error} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} /> : null}

        <Card>
          <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: spacing.sm }}>Kecamatan</Text>
          <TouchableOpacity onPress={() => setShowKecPicker(true)} style={styles.select}>
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {kec.find((k) => k.id === kecId)?.nama ?? 'Pilih kecamatan'} ▾
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button title="+ Kecamatan" small variant="outline" onPress={() => setShowKecForm(true)} style={{ flex: 1 }} />
            <Button title="Hapus Kec." small variant="ghost" onPress={confirmDeleteKec} style={{ flex: 1 }} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Desa / Kepenghuluan ({desa.length})</Text>
          <TouchableOpacity onPress={openAddDesa}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Tambah</Text>
          </TouchableOpacity>
        </View>

        {desa.length ? (
          desa.map((d) => (
            <Card key={d.id} style={{ paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{d.nama}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <TouchableOpacity onPress={() => openEditDesa(d)}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteDesa(d)}>
                    <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <EmptyView text="Belum ada desa di kecamatan ini" />
          </Card>
        )}
      </Screen>

      <SelectModal
        visible={showKecPicker}
        title="Pilih Kecamatan"
        options={kec.map((k) => ({ label: k.nama, value: k.id }))}
        value={kecId ?? undefined}
        onSelect={(v) => pickKec(Number(v))}
        onClose={() => setShowKecPicker(false)}
      />

      {/* Form Desa */}
      <Modal visible={showDesaForm} transparent animationType="slide" onRequestClose={() => setShowDesaForm(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.md }}>
              {editDesa ? 'Ubah Desa' : 'Tambah Desa'}
            </Text>
            <Input label="Nama Desa / Kepenghuluan" value={desaNama} onChangeText={setDesaNama} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button title="Batal" variant="ghost" onPress={() => setShowDesaForm(false)} style={{ flex: 1 }} />
              <Button title="Simpan" onPress={saveDesa} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Form Kecamatan */}
      <Modal visible={showKecForm} transparent animationType="slide" onRequestClose={() => setShowKecForm(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.md }}>Tambah Kecamatan</Text>
            <Input label="Nama Kecamatan" value={kecNama} onChangeText={setKecNama} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button title="Batal" variant="ghost" onPress={() => setShowKecForm(false)} style={{ flex: 1 }} />
              <Button title="Simpan" onPress={saveKec} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  select: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
};
