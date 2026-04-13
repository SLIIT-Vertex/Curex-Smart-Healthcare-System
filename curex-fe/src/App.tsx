import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { DoctorLayout } from "./components/layout/doctor/DoctorLayout";
import { PatientLayout } from "./components/layout/patient/PatientLayout";
import { AdminLayout } from "./components/layout/admin/AdminLayout";

// Auth
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ToastContainer } from "./components/ui/ToastContainer";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

// Public
import { HomePage } from "./pages/HomePage";

// Admin
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminDoctorApproval } from "./pages/admin/AdminDoctorApproval";
import { AdminProfile } from "./pages/admin/AdminProfile";
import { AdminAppointments } from "./pages/admin/AdminAppointments";
import { AdminPayments } from "./pages/admin/AdminPayments";

// Doctor
import { DoctorDashboard } from "./pages/doctor/DoctorDashboard";
import { DoctorProfile } from "./pages/doctor/DoctorProfile";
import { DoctorPendingPage } from "./pages/doctor/DoctorPendingPage";
import { DoctorAvailability } from "./pages/doctor/DoctorAvailability";
import { DoctorPrescriptions } from "./pages/doctor/DoctorPrescriptions";
import { DoctorTelemedicineCenter } from "./pages/doctor/DoctorTelemedicineCenter";
import { PatientDashboard } from "./pages/patient/PatientDashboard";
import { PatientProfile } from "./pages/patient/PatientProfile";
import { PatientPrescriptions } from "./pages/patient/PatientPrescriptions";
import { PatientSymptomChecker } from "./pages/patient/PatientSymptomChecker";
import { PatientAppointments } from "./pages/patient/PatientAppointments";
import { PatientReports } from "./pages/patient/PatientReports";
import { PatientCheckout } from "./pages/patient/PatientCheckout";
import { PatientPayments } from "./pages/patient/PatientPayments";
import { PatientTelemedicineCenter } from "./pages/patient/PatientTelemedicineCenter";
import { SettingsPage } from "./pages/shared/SettingsPage";
import { useAuthSessionSync } from "./hooks/useAuthSessionSync";

function App() {
  useAuthSessionSync();

  return (
    <BrowserRouter>
      {/* Skip-to-content accessibility link */}
      <a
        href="#main"
        className="fixed left-4 top-0 z-100 -translate-y-full rounded-b-lg bg-primary px-4 py-2 text-sm font-medium text-surface no-underline shadow-md transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <Routes>
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

        {/* ── Auth ───────────────────────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Admin (ADMIN role only) ─────────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="doctor-approval" element={<AdminDoctorApproval />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ── Doctor (DOCTOR role only) ───────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["DOCTOR"]} />}>
          <Route path="/doctor/pending" element={<DoctorPendingPage />} />
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route
              index
              element={<Navigate to="/doctor/dashboard" replace />}
            />
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="profile" element={<DoctorProfile />} />
            <Route path="availability" element={<DoctorAvailability />} />
            <Route path="prescriptions" element={<DoctorPrescriptions />} />
            <Route path="telemedicine" element={<DoctorTelemedicineCenter />} />
            <Route
              path="telemedicine/:appointmentId"
              element={<DoctorTelemedicineCenter />}
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ── Patient (PATIENT role only) ─────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["PATIENT"]} />}>
          <Route path="/patient" element={<PatientLayout />}>
            <Route
              index
              element={<Navigate to="/patient/dashboard" replace />}
            />
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="prescriptions" element={<PatientPrescriptions />} />
            <Route path="symptom-checker" element={<PatientSymptomChecker />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route
              path="telemedicine"
              element={<PatientTelemedicineCenter />}
            />
            <Route
              path="telemedicine/:appointmentId"
              element={<PatientTelemedicineCenter />}
            />
            <Route path="reports" element={<PatientReports />} />
            <Route
              path="checkout/:appointmentId"
              element={<PatientCheckout />}
            />
            <Route path="payments" element={<PatientPayments />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ── Fallback ────────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global toast notification container */}
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
