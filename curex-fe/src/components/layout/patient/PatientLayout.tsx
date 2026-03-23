import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import '../../../styles/pages/DoctorDashboard.css'
import '../../../styles/pages/PatientDashboard.css'
import { PatientSidebar } from './PatientSidebar'
import { PatientTopBar } from './PatientTopBar'

export function PatientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <PatientSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PatientTopBar onMenuClick={toggleSidebar} />
        <main id="main" className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
