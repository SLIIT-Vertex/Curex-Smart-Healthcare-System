import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { DoctorLayout } from './components/layout/DoctorLayout'
import { HomePage } from './pages/HomePage'
import { DoctorDashboard } from './pages/doctor/DoctorDashboard'
import { DoctorProfile } from './pages/doctor/DoctorProfile'
import { DoctorAvailability } from './pages/doctor/DoctorAvailability'
import { DoctorPrescriptions } from './pages/doctor/DoctorPrescriptions'

function App() {
  return (
    <BrowserRouter>
      <a
        href="#main"
        className="fixed left-4 top-0 z-[100] -translate-y-full rounded-b-lg bg-primary px-4 py-2 text-sm font-medium text-surface no-underline shadow-md transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <Routes>
        {/* Public home */}
        <Route
          path="/"
          element={
            <>
              <Header />
              <main id="main" className="flex-1">
                <HomePage />
              </main>
              <Footer />
            </>
          }
        />

        {/* Doctor dashboard — all /doctor/* wrapped in DoctorLayout */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="availability" element={<DoctorAvailability />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
