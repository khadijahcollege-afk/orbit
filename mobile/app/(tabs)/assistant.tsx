/* Assistant — RAG ber-sitasi dari API v1 (POST /assistant/chat).
   Jawaban berbasis data tersimpan; aksi yang diusulkan butuh approval di web. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, ScrollView, type ScrollViewInstance } from 'react-native'
import { Btn, Card, Field, Muted } from '@/components/ui'
import { Send } from '@/components/icons'
import { api, type ChatAnswer } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, radius, spacing } from '@/lib/theme'

interface Turn {
  role: 'user' | 'ai'
  text: string
  citations?: ChatAnswer['citations']
  insufficient?: boolean
}

export default function AssistantScreen() {
  const { token, me } = useAuth()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const scrollRef = useRef<ScrollViewInstance | null>(null)
  const convIdRef = useRef<string | null>(null)

  // Riwayat: muat percakapan terakhir saat layar dibuka.
  useEffect(() => {
    if (!token || !me?.workspace_id) return
    ;(async () => {
      try {
        const list = await api<{ data: { id: string; title: string }[] }>(`/assistant/conversations?workspace_id=${me.workspace_id}`, { token })
        const latest = list.data[0]
        if (!latest) return
        const d = await api<{ id: string; messages: { role: string; content: string; citations: { title: string }[]; insufficient_data: boolean }[] }>(
          `/assistant/conversations/${latest.id}`,
          { token },
        )
        convIdRef.current = d.id
        setTurns(
          d.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai', text: m.content, citations: m.citations as Turn['citations'], insufficient: m.insufficient_data })),
        )
      } catch {
        /* mulai kosong bila riwayat gagal dimuat */
      }
    })()
  }, [token, me?.workspace_id])

  const send = useCallback(async () => {
    const message = input.trim()
    if (!message || !token || !me?.workspace_id || busy) return
    setInput('')
    setErr('')
    setTurns((t) => [...t, { role: 'user', text: message }])
    setBusy(true)
    try {
      const r = await api<ChatAnswer>('/assistant/chat', {
        method: 'POST',
        token,
        body: { workspace_id: me.workspace_id, message, conversation_id: convIdRef.current ?? undefined },
      })
      convIdRef.current = r.conversation_id
      setTurns((t) => [...t, { role: 'ai', text: r.answer, citations: r.citations, insufficient: r.insufficient_data }])
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menghubungi assistant')
    } finally {
      setBusy(false)
    }
  }, [input, token, me?.workspace_id, busy])

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.h1}>Assistant</Text>
        <Muted>Jawab HANYA dari memori tersimpan Anda, ber-sitasi.</Muted>
      </View>

      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {turns.length === 0 && (
          <Card>
            <Muted>Coba: “Kapan kontrak sewa saya berakhir?” atau “Berapa total tagihan bulan ini?”</Muted>
          </Card>
        )}
        {turns.map((t, i) => (
          <View key={i} style={[styles.bubble, t.role === 'user' ? styles.user : styles.ai]}>
            <Text style={t.role === 'user' ? styles.userText : styles.aiText}>{t.text}</Text>
            {t.insufficient ? <Muted>Belum ada data yang cukup — masukkan dokumen terkait lewat Capture.</Muted> : null}
            {t.citations?.length ? (
              <View style={{ marginTop: spacing(1) }}>
                {t.citations.map((c, j) => (
                  <Text key={j} style={styles.cite}>📄 {c.title}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {busy && <Muted>Assistant berpikir…</Muted>}
        {err ? <Text style={styles.err}>{err}</Text> : null}
      </ScrollView>

      <View style={styles.composer}>
        <Field
          label=""
          value={input}
          onChangeText={setInput}
          placeholder="Tanya apa saja dari memori Anda…"
          multiline
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Btn label="Kirim" onPress={send} busy={busy} style={styles.send} />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: spacing(3) },
  header: { marginBottom: spacing(2) },
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  chat: { flex: 1 },
  chatContent: { paddingBottom: spacing(2) },
  bubble: { borderRadius: radius.md, padding: spacing(2), marginBottom: spacing(1.5), maxWidth: '92%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  ai: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  userText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  aiText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  cite: { color: colors.muted, fontSize: 11, marginTop: 2 },
  err: { color: colors.danger, fontSize: 13 },
  composer: { flexDirection: 'row', gap: spacing(1.5), alignItems: 'flex-end', paddingTop: spacing(2) },
  send: { minHeight: 44 },
})
