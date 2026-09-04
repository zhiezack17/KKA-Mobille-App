import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

/* ---------------------------------- Screen --------------------------------- */

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  style?: ViewStyle;
}) {
  const content = <View style={[padded && styles.screenPad, style]}>{children}</View>;

  if (!scroll) return <View style={styles.screen}>{content}</View>;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshing !== undefined ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      {content}
    </ScrollView>
  );
}

/* ----------------------------------- Card ---------------------------------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress} activeOpacity={0.8}>
      {children}
    </Wrapper>
  );
}

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost' | 'accent';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  small = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'primary' ? colors.primary :
    variant === 'accent' ? colors.gold :
    variant === 'danger' ? colors.danger :
    'transparent';
  const border = variant === 'outline' ? colors.primary : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger' ? colors.white :
    variant === 'accent' ? colors.primaryDeep :
    variant === 'outline' ? colors.primary : colors.muted;

  const base: ViewStyle = {
    backgroundColor: bg,
    borderWidth: variant === 'outline' ? 1.5 : 0,
    borderColor: border,
    borderRadius: radius.md,
    paddingVertical: small ? 8 : 13,
    paddingHorizontal: small ? 14 : 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled || loading ? 0.55 : 1,
  };

  return (
    <Pressable style={[base, style]} onPress={onPress} disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}

/* ----------------------------------- Input --------------------------------- */

export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

/* ----------------------------------- Badge --------------------------------- */

export function Badge({
  children,
  color = colors.primary,
  bg,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? color + '1A' }]}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

/* -------------------------------- Info row --------------------------------- */

export function InfoRow({ label, value, bold }: { label: string; value?: React.ReactNode; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, bold && { fontWeight: '700' }]}>{value ?? '-'}</Text>
    </View>
  );
}

/* --------------------------------- Loading --------------------------------- */

export function Loading({ text = 'Memuat data...' }: { text?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.muted, marginTop: spacing.md }}>{text}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.danger, fontWeight: '700', marginBottom: spacing.sm }}>Terjadi kesalahan</Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: spacing.lg }}>{message}</Text>
      {onRetry ? <Button title="Coba lagi" onPress={onRetry} small /> : null}
    </View>
  );
}

export function EmptyView({ text = 'Belum ada data' }: { text?: string }) {
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.muted, fontSize: 24, marginBottom: spacing.xs }}>🗂️</Text>
      <Text style={{ color: colors.muted }}>{text}</Text>
    </View>
  );
}

/* -------------------------------- SelectModal ------------------------------ */

export interface SelectOption {
  label: string;
  value: number | string;
}

export function SelectModal({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  value?: number | string | null;
  onSelect: (value: number | string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(query));
  }, [options, q]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>Tutup</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Cari..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = String(item.value) === String(value ?? '');
              return (
                <TouchableOpacity
                  style={[styles.optionRow, selected && { backgroundColor: colors.primaryLight }]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.optionText, selected && { color: colors.primary, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  {selected ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<EmptyView text="Tidak ditemukan" />}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenPad: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    marginBottom: 0,
    borderRadius: radius.lg,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  statGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  statSub: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: spacing.lg,
  },
  infoLabel: { color: colors.muted, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 220 },
  modalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 15, color: colors.text, flexShrink: 1 },
});

export type StatTone = 'emerald' | 'blue' | 'gold' | 'teal' | 'rose';

const STAT_TONES: Record<StatTone, { bg: string; fg: string; sub: string }> = {
  emerald: { bg: '#047857', fg: '#FFFFFF', sub: '#A7F3D0' },
  blue: { bg: '#2563EB', fg: '#FFFFFF', sub: '#BFDBFE' },
  gold: { bg: '#EAB308', fg: '#022C22', sub: '#78350F' },
  teal: { bg: '#0F766E', fg: '#FFFFFF', sub: '#99F6E4' },
  rose: { bg: '#BE123C', fg: '#FFFFFF', sub: '#FECDD3' },
};

export function StatCard({
  label,
  value,
  sub,
  color = colors.primary,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tone?: StatTone;
}) {
  const t = tone ? STAT_TONES[tone] : null;
  if (t) {
    return (
      <View style={[styles.statCard, { backgroundColor: t.bg }]}>
        <View style={styles.statGlow} />
        <Text style={[styles.statLabel, { color: t.sub }]}>{label}</Text>
        <Text style={[styles.statValue, { color: t.fg }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {sub ? <Text style={[styles.statSub, { color: t.sub }]}>{sub}</Text> : null}
      </View>
    );
  }
  return (
    <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '800', marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: spacing.md }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
      }}
    >
      <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: colors.gold }} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primaryDarker }}>{children}</Text>
    </View>
  );
}
