/* Pendaftaran akun baru (register + auto-login). */
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Btn, Card, Field } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { api, ApiError } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

export default function Daftar() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr('')
    setBusy(true)
    try {
      await api('/auth/register', { method: 'POST', body: form })
      await signIn(form.email.trim(), form.password)
      router.replace('/(tabs)')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal mendaftar — periksa koneksi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.title}>Buat akun ORBIT</Text>
        <Card>
          <Field label="Nama lengkap" value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} placeholder="Andi Pratama" />
          <Field label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" />
          <Field label="Password (min. 8 karakter)" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry placeholder="••••••••" />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Btn label="Daftar" onPress={submit} busy={busy} />
        </Card>
        <Btn label="Kembali" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing(2) }} />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: spacing(3) },
  center: { flex: 1, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: spacing(3) },
  err: { color: colors.danger, fontSize: 13, marginBottom: spacing(2) },
})
