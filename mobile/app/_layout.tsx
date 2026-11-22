/* Layout root — AuthProvider + guard: belum login → /masuk */
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '@/lib/auth'
import { colors } from '@/lib/theme'

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.navy },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="masuk" />
        <Stack.Screen name="daftar" />
        <Stack.Screen name="akun" />
      </Stack>
    </AuthProvider>
  )
}
