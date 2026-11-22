/* Home/Ringkasan — dashboard API v1: prioritas, approval, pengingat, dokumen terkini. */
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Btn, Card, Heading, Muted, Row, Screen, Chip } from '@/components/ui'
import { api, fmtDate, type Dashboard } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'

export default function HomeScreen() {
  const { token, me } = useAuth()
  const router = useRouter()
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    if (!token || !me?.workspace_id) return
    setErr('')
    api<Dashboard>(`/dashboard?workspace_id=${me.workspace_id}`, { token })
      .then(setDash)
      .catch((e) => setErr(e.message))
  }, [token, me?.workspace_id])

  useEffect(load, [load])

  return (
    <Screen>
      <View style={styles.top}>
        <View>
          <Text style={styles.halo}>Halo, {me?.full_name?.split(' ')[0] || 'Pengguna'}</Text>
          <Muted>Hidup Anda, tersambung.</Muted>
        </View>
        <Btn label="Akun" variant="ghost" onPress={() => router.push('/akun')} />
      </View>

      {err ? <Card><Muted>{err}</Muted></Card> : null}

      {!dash ? <Muted>Memuat…</Muted> : (
        <>
          <View style={styles.stats}>
            <Card style={styles.stat}>
              <Text style={styles.statNum}>{dash.pending_approvals}</Text>
              <Muted>Menunggu persetujuan</Muted>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statNum}>{dash.priorities.length}</Text>
              <Muted>Prioritas hari ini</Muted>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statNum}>{dash.due_soon.length}</Text>
              <Muted>Pengingat terdekat</Muted>
            </Card>
          </View>

          <Heading>Prioritas</Heading>
          <Card>
            {dash.priorities.length === 0 && <Muted>Tidak ada prioritas aktif.</Muted>}
            {dash.priorities.map((t) => (
              <Row key={t.id} title={t.title} subtitle={t.due_at ? `Tempo ${fmtDate(t.due_at)}` : undefined} />
            ))}
          </Card>

          <Heading>Pengingat terdekat</Heading>
          <Card>
            {dash.due_soon.length === 0 && <Muted>Belum ada pengingat terjadwal.</Muted>}
            {dash.due_soon.map((r) => (
              <Row key={r.id} title={r.title} subtitle={fmtDate(r.scheduled_at, true)} right={<Chip label={r.status} />} />
            ))}
          </Card>

          <Heading>Dokumen terkini</Heading>
          <Card>
            {dash.recent_documents.length === 0 && <Muted>Belum ada dokumen — tangkap lewat tab Capture.</Muted>}
            {dash.recent_documents.map((d) => (
              <Row
                key={d.id}
                title={d.title}
                subtitle={fmtDate(d.created_at)}
                right={<Chip label={d.processing_status} tone={d.processing_status === 'ready' ? 'ok' : d.processing_status === 'failed' ? 'bad' : 'muted'} />}
              />
            ))}
          </Card>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(3) },
  halo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: spacing(1.5), marginBottom: spacing(2) },
  stat: { flex: 1, alignItems: 'center', marginBottom: 0 },
  statNum: { color: colors.accent, fontSize: 24, fontWeight: '800', marginBottom: 4 },
})
