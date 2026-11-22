/* Timeline — urusan besar (events) + pengingat, digabung urut waktu. */
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Btn, Card, Chip, Heading, Muted, Screen } from '@/components/ui'
import { api, fmtDate, type EventItem, type ReminderItem } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'

interface Entry {
  kind: 'event' | 'reminder'
  when: string
  title: string
  sub?: string
  tone: 'accent' | 'warn' | 'ok'
  tag: string
}

export default function TimelineScreen() {
  const { token, me } = useAuth()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    if (!token || !me?.workspace_id) return
    setErr('')
    Promise.all([
      api<{ data: EventItem[] }>(`/events?workspace_id=${me.workspace_id}`, { token }),
      api<{ data: ReminderItem[] }>(`/reminders?workspace_id=${me.workspace_id}`, { token }),
    ])
      .then(([ev, rm]) => {
        const list: Entry[] = [
          ...ev.data.map((e) => ({
            kind: 'event' as const,
            when: e.start_at || e.end_at || '',
            title: e.title,
            sub: e.task_progress.total ? `Progres tugas: ${e.task_progress.done}/${e.task_progress.total}` : e.description || undefined,
            tone: 'accent' as const,
            tag: e.event_type || 'urusan besar',
          })),
          ...rm.data.map((r) => ({
            kind: 'reminder' as const,
            when: r.scheduled_at,
            title: r.title,
            tone: r.status === 'sent' ? ('ok' as const) : ('warn' as const),
            tag: r.status === 'sent' ? 'terkirim' : 'terjadwal',
          })),
        ]
          .filter((x) => x.when)
          .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
        setEntries(list)
      })
      .catch((e) => setErr(e.message))
  }, [token, me?.workspace_id])

  useEffect(load, [load])

  return (
    <Screen>
      <View style={styles.top}>
        <Heading>Timeline</Heading>
        <Btn label="Segarkan" variant="ghost" onPress={load} />
      </View>
      {err ? <Card><Muted>{err}</Muted></Card> : null}
      {!entries ? <Muted>Memuat…</Muted> : entries.length === 0 ? (
        <Card><Muted>Belum ada urusan besar atau pengingat. Susun rencana lewat Assistant di web, atau tunggu approval pertama Anda.</Muted></Card>
      ) : (
        entries.map((e, i) => (
          <Card key={`${e.kind}-${i}-${e.when}`}>
            <View style={styles.line}>
              <Text style={styles.when}>{fmtDate(e.when, true)}</Text>
              <Chip label={e.tag} tone={e.tone} />
            </View>
            <Text style={styles.title}>{e.title}</Text>
            {e.sub ? <Muted>{e.sub}</Muted> : null}
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  when: { color: colors.muted, fontSize: 12 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
})
