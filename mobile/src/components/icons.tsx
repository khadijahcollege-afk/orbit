/* Pembungkus ikon Feather (@expo/vector-icons) — blueprint menyebut Lucide;
   skeleton MVP memakai Feather (gaya serupa, tanpa react-native-svg).
   Signature cocok untuk tabBarIcon expo-router. */
import Feather from '@expo/vector-icons/Feather'
import type { ColorValue } from 'react-native'

export interface IconProps {
  color?: ColorValue
  size?: number
}

type FeatherName = React.ComponentProps<typeof Feather>['name']

function make(name: FeatherName) {
  return (props: IconProps) => (
    <Feather name={name} color={props.color == null ? undefined : (props.color as string)} size={props.size} />
  )
}

export const Home = make('home')
export const Inbox = make('inbox')
export const Camera = make('camera')
export const CalendarTimeline = make('calendar')
export const Sparkles = make('zap')
export const Settings = make('settings')
export const LogOut = make('log-out')
export const Refresh = make('refresh-cw')
export const Send = make('send')
export const UploadCloud = make('upload-cloud')
export const FileText = make('file-text')
export const Plus = make('plus')
export const AlertCircle = make('alert-circle')
export const CheckCircle = make('check-circle')
