import { Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import Landing from './pages/Landing'
import Dashboard from './pages/app/Dashboard'
import Console from './pages/Console'
import InboxPage from './pages/app/Inbox'
import TimelinePage from './pages/app/Timeline'
import CommitmentsPage from './pages/app/Commitments'
import ActionsPage from './pages/app/Actions'
import GraphPage from './pages/app/Graph'
import MemoryPage from './pages/app/Memory'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/console" element={<Console />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/inbox" element={<InboxPage />} />
        <Route path="/app/timeline" element={<TimelinePage />} />
        <Route path="/app/commitments" element={<CommitmentsPage />} />
        <Route path="/app/actions" element={<ActionsPage />} />
        <Route path="/app/graph" element={<GraphPage />} />
        <Route path="/app/memory" element={<MemoryPage />} />
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(251 28% 9%)',
            border: '1px solid hsl(248 20% 17%)',
            color: 'hsl(245 25% 96%)',
          },
        }}
      />
    </>
  )
}
