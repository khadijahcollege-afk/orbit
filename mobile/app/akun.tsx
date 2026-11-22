/* Akun — profil, paket & pemakaian, keluar. */
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Btn, Card, Chip, Field, Heading, Muted, Row, Screen } from '@/components/ui'
import { LogOut } from '@/components/icons'
import { api, fmtDate, fmtRp, type UsageInfo } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Guard } from '@/components/guard'
import { colors, spacing } from '@/lib/theme'

const TZ_OPTIONS = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC']

function Bar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(max, 1)) * 100))
  return (
    <View style={{ marginBottom: spacing(1.5) }}>
      <View style={styles.barLine}>
        <Muted>{label}</Muted>
        <Text style={styles.barVal}>{used} / {max}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

export default function AkunScreen() {
  const { token, me, signOut } = useAuth()
  const router = useRouter()
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [tz, setTz] = useState(me?.timezone || 'Asia/Jakarta')
  const [saved, setSaved] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [fbStatus, setFbStatus] = useState<'ok' | 'bad' | null>(null)

  const load = useCallback(() => {
    if (!token || !me?.workspace_id) return
    api<UsageInfo>(`/account/usage?workspace_id=${me.workspace_id}`, { token }).then(setUsage).catch(() => {})
  }, [token, me?.workspace_id])

  useEffect(load, [load])

  const saveTimezone = async () => {
    await api('/users/me', { method: 'PATCH', token, body: JSON.stringify({ timezone: tz }) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const sendFeedback = async () => {
    if (!feedback.trim() || !token) return
    try {
      await api('/feedback', { method: 'POST', token, body: JSON.stringify({ message: feedback, context: 'mobile' }) })
      setFeedback('')
      setFbStatus('ok')
    } catch {
      setFbStatus('bad')
    } finally {
      setTimeout(() => setFbStatus(null), 3000)
    }
  }

  return (
    <Guard>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={styles.top}>
          <Text style={styles.h1}>Akun</Text>
          <LogOut color={colors.muted} />
        </View>

        <Card>
          <Text style={styles.name}>{me?.full_name}</Text>
          <Muted>{me?.email}</Muted>
        </Card>

        <Heading>Zona waktu</Heading>
        <Card>
          <View style={styles.tzRow}>
            {TZ_OPTIONS.map((opt) => (
              <Chip key={opt} label={opt} tone={tz === opt ? 'accent' : 'muted'} onPress={() => setTz(opt)} />
            ))}
          </View>
          <Muted>Pengingat & timeline mengikuti zona waktu ini.</Muted>
          <View style={{ marginTop: spacing(2) }}>
            <Btn label={saved ? 'Tersimpan ✓' : 'Simpan zona waktu'} variant="ghost" onPress={saveTimezone} />
          </View>
        </Card>

        <Heading>Paket & pemakaian</Heading>
        {usage ? (
          <Card>
            <View style={styles.planLine}>
              <Text style={styles.planName}>{usage.plan.name}</Text>
              <Chip
                label={usage.plan.status}
                tone={usage.plan.status === 'active' || usage.plan.status === 'trialing' ? 'ok' : 'warn'}
              />
            </View>
            <Muted>
              {usage.plan.price_idr === 0 ? 'Gratis' : `${fmtRp(usage.plan.price_idr)}/bln`}
              {usage.plan.current_period_end ? ` · s.d. ${fmtDate(usage.plan.current_period_end)}` : ''}
            </Muted>
            <View style={{ marginTop: spacing(2) }}>
              <Bar label="Dokumen" used={usage.usage.documents} max={usage.limits.documents} />
              <Bar label="Jawaban AI bulan ini" used={usage.usage.answers_month} max={usage.limits.ai_answers_month} />
              <Bar label="Pengingat bulan ini" used={usage.usage.reminders_month} max={usage.limits.reminders_month} />
            </View>
            <Muted>Upgrade paket tersedia di konsol web (tab Akun → PAKET LANGGANAN).</Muted>
          </Card>
        ) : (
          <Card><Muted>Memuat pemakaian…</Muted></Card>
        )}

        <Heading>Umpan balik beta</Heading>
        <Card>
          <Field
            label="Bug, ide, atau hal membingungkan"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            placeholder="Tulis di sini (maks 2000 karakter)…"
          />
          {fbStatus === 'ok' && <Text style={styles.fbOk}>Terima kasih — masuk antrean review ✓</Text>}
          {fbStatus === 'bad' && <Text style={styles.fbErr}>Gagal mengirim — coba lagi nanti.</Text>}
          <Btn label="Kirim umpan balik" variant="ghost" onPress={sendFeedback} disabled={!feedback.trim()} />
        </Card>

        <Card>
          <Row title="Prinsip privasi" subtitle="Jawaban AI dari data tersimpan · semua aksi butuh persetujuan · data tidak dijual" />
          <Row title="Server" subtitle="API v1 lokal (node server/index.mjs)" />
        </Card>

        <Btn
          label="Keluar"
          variant="danger"
          onPress={async () => {
            await signOut()
            router.replace('/masuk')
          }}
        />
      </Screen>
    </Guard>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: colors.text, fontSize: 22, fontWeight: '800' },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  planLine: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), marginBottom: 4 },
  tzRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), marginBottom: spacing(1.5) },
  planName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  barLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barVal: { color: colors.text, fontSize: 12, fontWeight: '600' },
  barBg: { height: 6, borderRadius: 999, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  fbOk: { color: colors.success, fontSize: 12, marginBottom: spacing(1) },
  fbErr: { color: colors.danger, fontSize: 12, marginBottom: spacing(1) },
})
