import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LangProvider } from './context/LangContext'
import { StyleProvider } from './context/StyleContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { TeenProvider, useTeen } from './context/TeenModeContext'
import AuthPage from './pages/AuthPage'
import CalendarPage from './pages/CalendarPage'
import FriendsPage from './pages/FriendsPage'
import DiaryPage from './pages/DiaryPage'
import ProfilePage from './pages/ProfilePage'
import PersonProfilePage from './pages/PersonProfilePage'
import SearchPage from './pages/SearchPage'
import TodayPage from './pages/TodayPage'
import PregnancyPage from './pages/PregnancyPage'
import PregnancyPlanningSetup from './pages/PregnancyPlanningSetup'
import PregnancyPartnerResponsePage from './pages/PregnancyPartnerResponsePage'
import MedicationsPage from './pages/MedicationsPage'
import SubscriptionPage from './pages/SubscriptionPage'
import TeenSetupPage from './pages/TeenSetupPage'
import IntimacyPage from './pages/IntimacyPage'
import PersonalizationPage from './pages/PersonalizationPage'
import FeedbackPage from './pages/FeedbackPage'
import AdminPage from './pages/AdminPage'
import NoPeriodPage from './pages/NoPeriodPage'
import ActivityPage from './pages/ActivityPage'
import ActivityWishlistPage from './pages/ActivityWishlistPage'
import AboutPage from './pages/AboutPage'
import HealthPage from './pages/HealthPage'
import ResearchPage from './pages/ResearchPage'
import SyncPage from './pages/SyncPage'
import SportPage from './pages/SportPage'
import ClinicalTestsPage from './pages/ClinicalTestsPage'
import HowItWorksPage from './pages/HowItWorksPage'
import BodyModePage from './pages/BodyModePage'
import OnboardingPage from './pages/OnboardingPage'
import AppearancePage from './pages/AppearancePage'
import ExportPage from './pages/ExportPage'
import ViewLogPage from './pages/ViewLogPage'
import DysphoriaTracker from './pages/DysphoriaTracker'
import ModulePage from './pages/ModulePage'
import NutritionPage from './pages/NutritionPage'
import AchievementsPage from './pages/AchievementsPage'
import AchievementToast from './components/AchievementToast'
import ModuleConstructor from './components/ModuleConstructor'
import BottomNav from './components/BottomNav'
import TrialBanner from './components/TrialBanner'
import HealthArchivePage from './pages/HealthArchivePage'
import AvatarPage from './pages/AvatarPage'
import FirstAidPage from './pages/FirstAidPage'
import FirstAidKitPage from './pages/FirstAidKitPage'

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
    <StyleProvider>
      <SubscriptionProvider>
      <TeenProvider>
        <TeenGate>
          <TrialBanner />
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/diary" element={<DiaryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/person/:id" element={<PersonProfilePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/pregnancy" element={<PregnancyPage />} />
              <Route path="/pregnancy-planning-setup" element={<PregnancyPlanningSetup />} />
              <Route path="/pregnancy-partner-response" element={<PregnancyPartnerResponsePage />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/intimacy" element={<IntimacyPage />} />
              <Route path="/personalization" element={<PersonalizationPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/no-period" element={<NoPeriodPage />} />
              <Route path="/teen-parent" element={<TeenSetupPage onDone={() => window.history.back()} initialStep={3} />} />
              <Route path="/nutrition" element={<NutritionPage />} />
              <Route path="/first-aid" element={<FirstAidPage />} />
              <Route path="/first-aid-kit" element={<FirstAidKitPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/activity-wishlist" element={<ActivityWishlistPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="/sport" element={<SportPage />} />
              <Route path="/tests" element={<ClinicalTestsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/module/:moduleKey" element={<ModulePage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/body-mode" element={<BodyModePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/avatar" element={<AvatarPage />} />
              <Route path="/health-archive" element={<HealthArchivePage />} />
              <Route path="/dysphoria" element={<DysphoriaTracker />} />
              <Route path="/profile-setup" element={<OnboardingPage defaultReturn="/profile" />} />
              <Route path="/appearance" element={<AppearancePage />} />
              <Route path="/modules" element={<ModuleConstructor />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/view-log" element={<ViewLogPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <AchievementToast />
      <BottomNav />
        </TeenGate>
      </TeenProvider>
    </SubscriptionProvider>
      </StyleProvider>
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
