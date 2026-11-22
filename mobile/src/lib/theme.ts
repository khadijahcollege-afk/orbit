/* Token desain ORBIT — dari blueprint docs/03-ui-ux-design.md */
export const colors = {
  navy: '#0B1020',
  surface: '#171E35',
  surfaceAlt: '#1D2540',
  primary: '#6655E8',
  accent: '#9A8CFF',
  light: '#F5F6FA',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  text: '#F5F6FA',
  muted: '#8A93A8',
  border: '#252D47',
} as const

export const radius = { sm: 12, md: 16, lg: 20 } as const
export const spacing = (n: number) => n * 8
