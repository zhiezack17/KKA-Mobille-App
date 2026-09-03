import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Text, View, StyleSheet } from 'react-native';
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
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>KKA</Text>
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
            Pastikan aplikasi Expo Go di HP sudah versi terbaru{'\n'}dan data login sama dengan aplikasi web KKA.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 6 },
  link: { color: colors.primary, textAlign: 'center', fontSize: 13, fontWeight: '600', marginVertical: spacing.sm },
  footnote: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
