import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LangProvider } from './context/LangContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { TeenProvider, useTeen } from './context/TeenModeContext'
import AuthPage from './pages/AuthPage'
import CalendarPage from './pages/CalendarPage'
import FriendsPage from './pages/FriendsPage'
import DiaryPage from './pages/DiaryPage'
import ProfilePage from './pages/ProfilePage'
import PregnancyPage from './pages/PregnancyPage'
import MedicationsPage from './pages/MedicationsPage'
import SubscriptionPage from './pages/SubscriptionPage'
import TeenSetupPage from './pages/TeenSetupPage'
import IntimacyPage from './pages/IntimacyPage'
import PersonalizationPage from './pages/PersonalizationPage'
import FeedbackPage from './pages/FeedbackPage'
import AdminPage from './pages/AdminPage'
import NoPeriodPage from './pages/NoPeriodPage'
import BottomNav from './components/BottomNav'
import TrialBanner from './components/TrialBanner'

function TeenGate({ children }) {
  const { profile } = useAuth()
  const { isTeen } = useTeen()
  const [setupDone, setSetupDone] = useState(false)
  const needsSetup = isTeen && !profile?.birth_year
  if (needsSetup && !setupDone) return <TeenSetupPage onDone={() => setSetupDone(true)} />
  return children
}

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:36, color:'var(--accent)', letterSpacing:'0.05em' }}>Elara</div>
      <div className="dot-loader"><span/><span/><span/></div>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <SubscriptionProvider>
      <TeenProvider>
        <TeenGate>
          <TrialBanner />
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
            <Routes>
              <Route path="/" element={<CalendarPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/diary" element={<DiaryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/pregnancy" element={<PregnancyPage />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/intimacy" element={<IntimacyPage />} />
              <Route path="/personalization" element={<PersonalizationPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/no-period" element={<NoPeriodPage />} />
              <Route path="/teen-parent" element={<TeenSetupPage onDone={() => window.history.back()} initialStep={3} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <BottomNav />
        </TeenGate>
      </TeenProvider>
    </SubscriptionProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
