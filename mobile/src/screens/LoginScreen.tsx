import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '../api/client';
import { getApiUrl, setApiUrl } from '../config';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { Button, Card, Input } from '../components/ui';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  // TODO: ganti dengan logo resmi saat file tersedia
  const logoLabel = 'KKA';

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      await setApiUrl(serverUrl);
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError('');
    try {
      await setApiUrl(serverUrl);
      const data = (await api<{ name?: string; version?: string }>('/')) as unknown as {
        name?: string;
        version?: string;
      };
      Alert.alert('Terhubung ✓', `Server aktif.\n${data?.name ?? 'KKA Mobile API'}${data?.version ? ' v' + data.version : ''}`);
    } catch (e) {
      Alert.alert('Gagal terhubung', e instanceof Error ? e.message : 'Periksa URL API.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.decoGold} />
      <View style={styles.decoEmerald} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>{logoLabel}</Text>
            </View>
            <Text style={styles.title}>KKA Mobile</Text>
            <Text style={styles.subtitle}>Kertas Kerja Audit · Inspektorat Kabupaten Rokan Hilir</Text>
          </View>

          <Card>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="nama@domain.go.id"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              onSubmitEditing={handleLogin}
            />
            {error ? (
              <Text style={{ color: colors.danger, marginBottom: spacing.md, fontSize: 13 }}>{error}</Text>
            ) : null}
            <Button title="Masuk" onPress={handleLogin} loading={loading} />
          </Card>

          <Text
            style={styles.link}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Sembunyikan pengaturan server' : 'Pengaturan server (lanjutan)'}
          </Text>

          {showAdvanced ? (
            <Card>
              <Input label="URL API" value={serverUrl} onChangeText={setServerUrl} placeholder="https://kka.arsipdigital-inspektorat.com/api" autoCapitalize="none" />
              <Button title={testing ? 'Menguji...' : 'Uji koneksi'} variant="outline" onPress={handleTest} loading={testing} small />
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.sm }}>
                Isi dengan URL server live, tanpa garis miring di akhir.
              </Text>
            </Card>
          ) : null}

          <Text style={styles.footnote}>
            Pemerintah Kabupaten Rokan Hilir · Inspektorat Daerah
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDarker },
  decoGold: {
    position: 'absolute',
    top: -70,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(234, 179, 8, 0.09)',
  },
  decoEmerald: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoText: { color: colors.primaryDarker, fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: colors.white, letterSpacing: 0.5 },
  subtitle: { color: '#A7F3D0', fontSize: 13, textAlign: 'center', marginTop: 6 },
  link: { color: colors.gold, textAlign: 'center', fontSize: 13, fontWeight: '600', marginVertical: spacing.sm },
  footnote: { color: '#86EFAC', fontSize: 11, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
