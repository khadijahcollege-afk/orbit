/* Konteks autentikasi — restore sesi dari token tersimpan, login, logout. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokenStore, type Me } from './api'

interface AuthState {
  token: string | null
  me: Me | null
  ws: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const saved = await tokenStore.get()
        if (!saved) return
        const user = await api<Me>('/users/me', { token: saved })
        setToken(saved)
        setMe(user)
      } catch {
        await tokenStore.clear()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      token,
      me,
      ws: me?.workspace_id ?? null,
      loading,
      async signIn(email, password) {
        const r = await api<{ token: string; user: Me; workspace_id: string }>('/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        await tokenStore.set(r.token)
        setToken(r.token)
        setMe({ ...r.user, workspace_id: r.workspace_id })
      },
      async signOut() {
        try {
          if (token) await api('/auth/logout', { method: 'POST', token })
        } catch {
          /* sesi sudah mati — abaikan */
        }
        await tokenStore.clear()
        setToken(null)
        setMe(null)
      },
    }),
    [token, me, loading],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth harus di dalam AuthProvider')
  return v
}
