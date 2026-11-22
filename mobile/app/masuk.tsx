/* Layar masuk — akun demo pra-isi untuk memudahkan uji. */
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Btn, Card, Field, Muted } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

export default function Masuk() {
  const { signIn } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ registered?: string }>()
  const [email, setEmail] = useState('demo@orbit.id')
  const [password, setPassword] = useState('orbit12345')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr('')
    setBusy(true)
    try {
      const me = await signIn(email.trim(), password)
      router.replace(me.onboarded_at ? '/(tabs)' : '/onboarding')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal masuk — periksa koneksi ke server API')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.logo}>🪐 ORBIT</Text>
        <Text style={styles.tag}>Hidup Anda, Tersambung.</Text>
        <Card style={styles.card}>
          {params.registered ? <Muted>Akun dibuat — silakan masuk.</Muted> : null}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Btn label="Masuk" onPress={submit} busy={busy} style={{ marginTop: spacing(1) }} />
          <View style={{ marginTop: spacing(2.5) }}>
            <Btn label="Belum punya akun? Daftar" variant="ghost" onPress={() => router.push('/daftar')} />
          </View>
        </Card>
        <Muted>Butuh server ORBIT berjalan: node server/index.mjs (port 8787)</Muted>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: spacing(3) },
  center: { flex: 1, justifyContent: 'center' },
  logo: { color: colors.text, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  tag: { color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: spacing(4) },
  card: { marginTop: spacing(2) },
  err: { color: colors.danger, fontSize: 13, marginBottom: spacing(2) },
})
