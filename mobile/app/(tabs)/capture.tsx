/* Capture — aksi utama blueprint: masukkan catatan teks atau foto dokumen.
   Semua masuk pipeline yang sama: POST /documents → PUT uploads → POST process. */
import { useCallback, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Btn, Card, Chip, Field, Heading, Muted, Screen } from '@/components/ui'
import { UploadCloud } from '@/components/icons'
import { api, type DocItem } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'

interface Picked {
  uri: string
  name: string
  mime: string
  size: number
}

export default function CaptureScreen() {
  const { token, me } = useAuth()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<Picked | null>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'bad'; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setStatus({ kind: 'bad', msg: 'Izin galeri ditolak' })
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    const mime = a.mimeType || (a.uri.endsWith('.png') ? 'image/png' : 'image/jpeg')
    setPhoto({
      uri: a.uri,
      name: `foto-${Date.now()}.${mime.split('/')[1]}`,
      mime,
      size: a.fileSize || Math.round((a.fileSize ?? 400_000)),
    })
  }

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setStatus({ kind: 'bad', msg: 'Izin kamera ditolak' })
      return
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    const mime = a.mimeType || 'image/jpeg'
    setPhoto({ uri: a.uri, name: `jepret-${Date.now()}.jpg`, mime, size: a.fileSize || 400_000 })
  }

  const submit = useCallback(async () => {
    if (!token || !me?.workspace_id) return
    const isPhoto = !!photo
    if (!isPhoto && (!title.trim() || !text.trim())) {
      setStatus({ kind: 'bad', msg: 'Judul dan isi catatan wajib' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const fileTitle = isPhoto ? title.trim() || `Foto dokumen ${new Date().toLocaleDateString('id-ID')}` : title.trim()
      const created = await api<DocItem & { upload: { url: string } }>('/documents', {
        method: 'POST',
        token,
        body: {
          workspace_id: me.workspace_id,
          title: fileTitle,
          file_type: isPhoto ? photo!.mime : 'text/plain',
          file_size: isPhoto ? photo!.size : new Blob([text]).size,
          source_type: isPhoto ? 'upload' : 'note',
          description: isPhoto ? 'Foto dari aplikasi mobile' : 'Catatan teks dari aplikasi mobile',
        },
      })
      if (isPhoto) {
        // RN: FormData dengan uri didukung native; web perlu Blob fetch.
        const form = new FormData()
        if (Platform.OS === 'web') {
          const blob = await (await fetch(photo!.uri)).blob()
          form.append('file', blob, photo!.name)
        } else {
          form.append('file', { uri: photo!.uri, name: photo!.name, type: photo!.mime } as unknown as Blob)
        }
        await api(created.upload.url, { method: 'PUT', token, raw: form })
      } else {
        await api(created.upload.url, { method: 'PUT', token, raw: text })
      }
      await api(`/documents/${created.id}/process`, { method: 'POST', token, body: {} })
      setStatus({ kind: 'ok', msg: 'Terkirim ke Inbox — diproses pipeline memori.' })
      setTitle('')
      setText('')
      setPhoto(null)
    } catch (e) {
      setStatus({ kind: 'bad', msg: e instanceof Error ? e.message : 'Gagal mengirim' })
    } finally {
      setBusy(false)
    }
  }, [token, me?.workspace_id, title, text, photo])

  return (
    <Screen>
      <Heading>Capture</Heading>
      <Muted>Masukkan catatan hidup Anda — nanti ORBIT mengekstrak data pentingnya dan menautkannya ke memori.</Muted>

      <Card>
        <Field label="Judul" value={title} onChangeText={setTitle} placeholder="Contoh: Invoice internet November" />
        <Field
          label="Isi catatan"
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Tempel teks tagihan, catatan janji temu, hal penting dari percakapan…"
        />
        <View style={styles.photoRow}>
          <Btn label="Pilih foto" variant="ghost" onPress={pickPhoto} />
          <Btn label="Kamera" variant="ghost" onPress={takePhoto} />
          <UploadCloud color={colors.accent} />
        </View>
        {photo ? (
          <View style={{ marginTop: spacing(1.5) }}>
            <Chip label={photo.name} tone="accent" />
          </View>
        ) : null}
        {status ? (
          <Text style={status.kind === 'ok' ? styles.ok : styles.err}>{status.msg}</Text>
        ) : null}
        <Btn
          label={photo ? 'Kirim foto ke Inbox' : 'Kirim catatan ke Inbox'}
          onPress={submit}
          busy={busy}
          style={{ marginTop: spacing(2) }}
        />
      </Card>

      <Card>
        <Muted>Prinsip ORBIT: dokumen Anda diproses di server ORBIT Anda sendiri; ekstraksi butuh persetujuan bila ragu, tidak ada yang dijual.</Muted>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', gap: spacing(1.5), alignItems: 'center', marginTop: spacing(1) },
  ok: { color: colors.success, fontSize: 13, marginTop: spacing(2) },
  err: { color: colors.danger, fontSize: 13, marginTop: spacing(2) },
})
