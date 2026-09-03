import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { UserApi } from '../api/endpoints';
import { getApiUrl, setApiUrl } from '../config';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { Button, Card, Input, Screen, SectionTitle } from '../components/ui';

export default function ProfileScreen() {
  const { user, signOut, setUser } = useAuth();

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState('');

  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [saveUrlLoading, setSaveUrlLoading] = useState(false);
  const [urlMsg, setUrlMsg] = useState('');

  useEffect(() => {
    setNama(user?.nama ?? '');
    setNip(user?.nip ?? '');
    setJabatan(user?.jabatan ?? '');
  }, [user]);

  async function handleSaveProfile() {
    setProfileMsg('');
    setSaveProfileLoading(true);
    try {
      const updated = await UserApi.updateProfile({ nama: nama.trim() || user?.nama || '', nip: nip.trim(), jabatan: jabatan.trim() });
      await setUser(updated);
      setProfileMsg('✅ Profil berhasil diperbarui.');
    } catch (e) {
      setProfileMsg('⚠️ ' + (e instanceof Error ? e.message : 'Gagal memperbarui profil.'));
    } finally {
      setSaveProfileLoading(false);
    }
  }

  async function handleChangePassword() {
    setPassMsg('');
    if (newPass.length < 6) {
      setPassMsg('Password baru minimal 6 karakter.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg('Konfirmasi password tidak cocok.');
      return;
    }
    setPassLoading(true);
    try {
      await UserApi.changePassword(oldPass, newPass);
      setPassMsg('✅ Password berhasil diganti.');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (e) {
      setPassMsg('⚠️ ' + (e instanceof Error ? e.message : 'Gagal mengganti password.'));
    } finally {
      setPassLoading(false);
    }
  }

  async function handleSaveUrl() {
    setUrlMsg('');
    setSaveUrlLoading(true);
    try {
      await setApiUrl(serverUrl);
      setUrlMsg('✅ URL API tersimpan.');
    } catch (e) {
      setUrlMsg('⚠️ ' + (e instanceof Error ? e.message : 'Gagal menyimpan URL.'));
    } finally {
      setSaveUrlLoading(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Keluar', 'Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="light" />
      <Screen>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>{user?.nama}</Text>
          <Text style={{ color: colors.muted }}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <BadgeCh color={user?.role === 'admin' ? colors.warning : colors.primary}>
              {user?.role === 'admin' ? 'Administrator' : 'Auditor'}
            </BadgeCh>
            {user?.jabatan ? <BadgeCh color={colors.muted}>{user.jabatan}</BadgeCh> : null}
          </View>
        </Card>

        <SectionTitle>Ubah Profil</SectionTitle>
        <Card>
          <Input label="Nama" value={nama} onChangeText={setNama} />
          <Input label="NIP" value={nip} onChangeText={setNip} />
          <Input label="Jabatan" value={jabatan} onChangeText={setJabatan} />
          {profileMsg ? <Text style={{ color: colors.muted, marginBottom: spacing.sm, fontSize: 13 }}>{profileMsg}</Text> : null}
          <Button title="Simpan Profil" onPress={handleSaveProfile} loading={saveProfileLoading} />
        </Card>

        <SectionTitle>Ganti Password</SectionTitle>
        <Card>
          <Input label="Password Lama" value={oldPass} onChangeText={setOldPass} secureTextEntry />
          <Input label="Password Baru" value={newPass} onChangeText={setNewPass} secureTextEntry />
          <Input label="Konfirmasi Password Baru" value={confirmPass} onChangeText={setConfirmPass} secureTextEntry />
          {passMsg ? <Text style={{ color: colors.muted, marginBottom: spacing.sm, fontSize: 13 }}>{passMsg}</Text> : null}
          <Button title="Ganti Password" onPress={handleChangePassword} loading={passLoading} />
        </Card>

        <SectionTitle>Server</SectionTitle>
        <Card>
          <Input label="URL API" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" />
          {urlMsg ? <Text style={{ color: colors.muted, marginBottom: spacing.sm, fontSize: 13 }}>{urlMsg}</Text> : null}
          <Button title="Simpan URL API" variant="outline" onPress={handleSaveUrl} loading={saveUrlLoading} />
        </Card>

        <Button title="Keluar" variant="danger" onPress={confirmLogout} style={{ marginTop: spacing.md, marginBottom: spacing.xl }} />
        <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginBottom: spacing.xl }}>
          KKA Mobile v1.0.0 · Data sinkron dengan server KKA
        </Text>
      </Screen>
    </SafeAreaView>
  );
}

function BadgeCh({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View style={{ backgroundColor: color + '1A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}
