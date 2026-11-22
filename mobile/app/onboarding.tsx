/* Onboarding mobile (docs/08): pilih zona waktu + bahasa saat pertama masuk. */
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { Btn, Card, Chip, Heading, Muted, Screen } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Guard } from '@/components/guard'
import { colors, spacing } from '@/lib/theme'

const TZ_OPTIONS = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC']
const LOCALES = [
  { id: 'id-ID', label: 'Indonesia' },
  { id: 'en', label: 'English' },
]

export default function OnboardingScreen() {
  const { token, me, loading } = useAuth()
  const router = useRouter()
  const [tz, setTz] = useState(me?.timezone || 'Asia/Jakarta')
  const [locale, setLocale] = useState(me?.locale || 'id-ID')
  const [notif, setNotif] = useState(true)
  const [busy, setBusy] = useState(false)

  if (loading) return <Guard>{null}</Guard>
  if (!token) return <Redirect href="/masuk" />
  if (me?.onboarded_at) return <Redirect href="/(tabs)" />

  const submit = async () => {
    setBusy(true)
    try {
      await api('/users/me/onboarding', { method: 'POST', token, body: JSON.stringify({ timezone: tz, locale, notification_optin: notif }) })
      router.replace('/(tabs)')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Selamat datang 👋</Text>
      <Muted>Dua preferensi kecil — semua bisa diubah di tab Akun.</Muted>

      <Card>
        <Heading>Zona waktu</Heading>
        <View style={styles.chips}>
          {TZ_OPTIONS.map((opt) => (
            <Chip key={opt} label={opt} tone={tz === opt ? 'accent' : 'muted'} onPress={() => setTz(opt)} />
          ))}
        </View>
        <Heading>Bahasa</Heading>
        <View style={styles.chips}>
          {LOCALES.map((l) => (
            <Chip key={l.id} label={l.label} tone={locale === l.id ? 'accent' : 'muted'} onPress={() => setLocale(l.id)} />
          ))}
        </View>
        <Heading>Notifikasi pengingat</Heading>
        <View style={styles.chips}>
          <Chip label="Ya, ingatkan saya" tone={notif ? 'accent' : 'muted'} onPress={() => setNotif(true)} />
          <Chip label="Nanti saja" tone={!notif ? 'accent' : 'muted'} onPress={() => setNotif(false)} />
        </View>
        <Btn label="Mulai pakai ORBIT" onPress={submit} busy={busy} style={{ marginTop: spacing(2) }} />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: spacing(3) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), marginBottom: spacing(2) },
})
