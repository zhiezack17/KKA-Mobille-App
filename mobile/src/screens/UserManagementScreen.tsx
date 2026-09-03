import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { UserApi } from '../api/endpoints';
import { isUnauthorized } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { Badge, Button, Card, EmptyView, ErrorView, Input, Loading, Screen } from '../components/ui';
import type { ApiUser } from '../types';

export default function UserManagementScreen() {
  const { signOut, token, user: me } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<ApiUser | null>(null);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'auditor' | 'admin'>('auditor');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const u = await UserApi.list();
      setUsers(u);
      setError('');
    } catch (e) {
      if (isUnauthorized(e)) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  }, [token, signOut]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  function openAdd() {
    setEdit(null);
    setNama('');
    setEmail('');
    setPassword('');
    setRole('auditor');
    setNip('');
    setJabatan('');
    setIsActive(true);
    setShowForm(true);
  }

  function openEdit(u: ApiUser) {
    setEdit(u);
    setNama(u.nama ?? '');
    setEmail(u.email ?? '');
    setPassword('');
    setRole(u.role === 'admin' ? 'admin' : 'auditor');
    setNip(u.nip ?? '');
    setJabatan(u.jabatan ?? '');
    setIsActive((u.is_active ?? 1) === 1);
    setShowForm(true);
  }

  async function saveUser() {
    if (!nama.trim() || !email.trim()) {
      Alert.alert('Validasi', 'Nama dan email wajib diisi.');
      return;
    }
    if (!edit && password.length < 6) {
      Alert.alert('Validasi', 'Password baru minimal 6 karakter.');
      return;
    }
    setSaving(true);
    try {
      if (edit) {
        await UserApi.update(edit.id, {
          nama: nama.trim(),
          role,
          nip: nip.trim() || undefined,
          jabatan: jabatan.trim() || undefined,
          is_active: isActive ? 1 : 0,
          password: password || undefined,
        });
      } else {
        await UserApi.create({
          nama: nama.trim(),
          email: email.trim(),
          password,
          role,
          nip: nip.trim() || undefined,
          jabatan: jabatan.trim() || undefined,
        });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e instanceof Error ? e.message : 'Email mungkin sudah dipakai.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(u: ApiUser) {
    if (u.id === me?.id) {
      Alert.alert('Tidak bisa', 'Anda tidak dapat menghapus akun sendiri.');
      return;
    }
    Alert.alert('Hapus Pengguna', `Hapus akun "${u.nama}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await UserApi.remove(u.id);
            await load();
          } catch (e) {
            Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Coba lagi.');
          }
        },
      },
    ]);
  }

  async function toggleActive(u: ApiUser) {
    try {
      await UserApi.update(u.id, { is_active: (u.is_active ?? 1) === 1 ? 0 : 1 });
      await load();
    } catch (e) {
      Alert.alert('Gagal mengubah status', e instanceof Error ? e.message : 'Coba lagi.');
    }
  }

  if (loading) return <Loading text="Memuat pengguna..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        {error ? <ErrorView message={error} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} /> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Pengguna ({users.length})</Text>
          <TouchableOpacity onPress={openAdd}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Tambah</Text>
          </TouchableOpacity>
        </View>

        {users.length ? (
          users.map((u) => {
            const active = (u.is_active ?? 1) === 1;
            return (
              <Card key={u.id} style={{ paddingVertical: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>
                    {u.nama} {u.id === me?.id ? '(Anda)' : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Badge color={u.role === 'admin' ? colors.warning : colors.primary}>
                      {u.role === 'admin' ? 'Admin' : 'Auditor'}
                    </Badge>
                    {!active ? <Badge color={colors.danger}>Nonaktif</Badge> : null}
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{u.email}</Text>
                {u.jabatan ? <Text style={{ color: colors.muted, fontSize: 12 }}>{u.jabatan}</Text> : null}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                  <TouchableOpacity onPress={() => openEdit(u)}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleActive(u)}>
                    <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 13 }}>
                      {active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(u)}>
                    <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <EmptyView text="Belum ada pengguna" />
          </Card>
        )}
      </Screen>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: spacing.md }}>
              {edit ? 'Ubah Pengguna' : 'Tambah Pengguna'}
            </Text>
            <Input label="Nama *" value={nama} onChangeText={setNama} />
            <Input label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!edit} />
            <Input
              label={edit ? 'Password baru (kosongkan bila tidak diganti)' : 'Password *'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Role</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <RoleChip label="Auditor" active={role === 'auditor'} onPress={() => setRole('auditor')} />
                <RoleChip label="Admin" active={role === 'admin'} onPress={() => setRole('admin')} />
              </View>
            </View>
            <Input label="NIP" value={nip} onChangeText={setNip} />
            <Input label="Jabatan" value={jabatan} onChangeText={setJabatan} />
            {edit ? (
              <TouchableOpacity onPress={() => setIsActive((v) => !v)} style={{ marginBottom: spacing.md }}>
                <Text style={{ color: isActive ? colors.success : colors.danger, fontWeight: '700' }}>
                  {isActive ? '✓ Akun AKTIF (ketuk untuk nonaktifkan)' : '✗ Akun NONAKTIF (ketuk untuk aktifkan)'}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button title="Batal" variant="ghost" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
              <Button title="Simpan" onPress={saveUser} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: radius.md,
        alignItems: 'center',
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.white : colors.muted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
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
