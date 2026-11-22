/* Bottom navigation mobile (blueprint docs/03): Home, Inbox, Capture, Timeline, Assistant. */
import { Tabs, Redirect } from 'expo-router'
import { Home, Inbox, Camera, CalendarTimeline, Sparkles } from '@/components/icons'
import { Guard } from '@/components/guard'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

export default function TabsLayout() {
  const { me } = useAuth()
  return (
    <Guard>
      {me && !me.onboarded_at ? <Redirect href="/onboarding" /> : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          sceneStyle: { backgroundColor: colors.navy },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: Home }} />
        <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: Inbox }} />
        <Tabs.Screen name="capture" options={{ title: 'Capture', tabBarIcon: Camera }} />
        <Tabs.Screen name="timeline" options={{ title: 'Timeline', tabBarIcon: CalendarTimeline }} />
        <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: Sparkles }} />
      </Tabs>
    </Guard>
  )
}
