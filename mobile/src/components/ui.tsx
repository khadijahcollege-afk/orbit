/* Primitif UI kecil bersama — gaya blueprint (surface gelap, radius 12–16, spacing 8px). */
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '@/lib/theme'

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>
}

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  style,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  busy?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        pressed && styles.btnPressed,
        (disabled || busy) && styles.btnDisabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.accent} size="small" />
      ) : (
        <Text
          style={[
            styles.btnLabel,
            {
              color:
                variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.accent,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function Field({ label, style, ...rest }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: spacing(2) }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        {...rest}
        placeholderTextColor={colors.muted}
        style={[styles.input, rest.multiline && styles.inputMultiline, style]}
      />
    </View>
  )
}

export function Chip({
  label,
  tone = 'muted',
  onPress,
}: {
  label: string
  tone?: 'muted' | 'ok' | 'warn' | 'bad' | 'accent'
  onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.chip, chipTones[tone], pressed && { opacity: 0.7 }]}>
      <Text style={[styles.chipLabel, chipTextTones[tone]]}>{label}</Text>
    </Pressable>
  )
}

const chipTones = {
  muted: { backgroundColor: colors.surfaceAlt },
  ok: { backgroundColor: 'rgba(22,163,74,0.15)' },
  warn: { backgroundColor: 'rgba(217,119,6,0.15)' },
  bad: { backgroundColor: 'rgba(220,38,38,0.15)' },
  accent: { backgroundColor: 'rgba(102,85,232,0.18)' },
} as const

const chipTextTones = {
  muted: { color: colors.muted },
  ok: { color: colors.success },
  warn: { color: colors.warning },
  bad: { color: colors.danger },
  accent: { color: colors.accent },
} as const

export function Row({ title, subtitle, right, onPress }: { title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  screenContent: { padding: spacing(3), paddingBottom: spacing(6) },
  heading: { color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing(1.5), textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  btn: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing(3),
    minHeight: 44,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnGhost: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  btnDanger: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(220,38,38,0.4)' },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  btnLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
})
