import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { DoctorLayout } from './components/layout/doctor/DoctorLayout'
import { PatientLayout } from './components/layout/patient/PatientLayout'
import { HomePage } from './pages/HomePage'
import { DoctorDashboard } from './pages/doctor/DoctorDashboard'
import { DoctorProfile } from './pages/doctor/DoctorProfile'
import { DoctorAvailability } from './pages/doctor/DoctorAvailability'
import { DoctorPrescriptions } from './pages/doctor/DoctorPrescriptions'
import { PatientDashboard } from './pages/patient/PatientDashboard'
import { PatientProfile } from './pages/patient/PatientProfile'
import { PatientPrescriptions } from './pages/patient/PatientPrescriptions'
import { PatientSymptomChecker } from './pages/patient/PatientSymptomChecker'
import { PatientAppointments } from './pages/patient/PatientAppointments'
import { PatientReports } from './pages/patient/PatientReports'

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

        {/* Patient dashboard — all /patient/* wrapped in PatientLayout */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
          <Route path="symptom-checker" element={<PatientSymptomChecker />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="reports" element={<PatientReports />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
