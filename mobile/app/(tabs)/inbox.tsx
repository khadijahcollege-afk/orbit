/* Inbox — daftar dokumen tersimpan (GET /documents). */
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Card, Heading, Muted, Row, Screen, Chip } from '@/components/ui'
import { api, fmtDate, fmtRp, type DocItem } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

const TONE: Record<DocItem['processing_status'], 'ok' | 'bad' | 'warn' | 'muted'> = {
  ready: 'ok',
  failed: 'bad',
  processing: 'warn',
  queued: 'muted',
}

export default function InboxScreen() {
  const { token, me } = useAuth()
  const [docs, setDocs] = useState<DocItem[] | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    if (!token || !me?.workspace_id) return
    setErr('')
    api<{ data: DocItem[] }>(`/documents?workspace_id=${me.workspace_id}&limit=50`, { token })
      .then((r) => setDocs(r.data))
      .catch((e) => setErr(e.message))
  }, [token, me?.workspace_id])

  useEffect(load, [load])

  return (
    <Screen>
      <Heading>Inbox</Heading>
      {err ? <Card><Muted>{err}</Muted></Card> : null}
      {!docs ? <Muted>Memuat…</Muted> : docs.length === 0 ? (
        <Card><Muted>Belum ada dokumen. Tangkap catatan atau foto di tab Capture.</Muted></Card>
      ) : (
        docs.map((d) => (
          <Card key={d.id}>
            <Row
              title={d.title}
              subtitle={`${d.file_type.toUpperCase()} · ${fmtDate(d.created_at)}${d.extraction?.amount ? ` · ${fmtRp(d.extraction.amount)}` : ''}`}
              right={<Chip label={d.processing_status} tone={TONE[d.processing_status]} />}
            />
            {d.extraction?.due_date ? (
              <Text style={styles.due}>Jatuh tempo: {fmtDate(d.extraction.due_date)}</Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  due: { color: colors.warning, fontSize: 12, marginTop: 6 },
})
