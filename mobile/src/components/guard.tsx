/* Guard rute: belum login → /masuk; sesi sedang dipulihkan → splash. */
import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

export function Guard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }
  if (!token) return <Redirect href="/masuk" />
  return <>{children}</>
}
