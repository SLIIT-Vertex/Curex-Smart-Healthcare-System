import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import '../../styles/pages/DoctorDashboard.css'
import { DoctorSidebar } from './DoctorSidebar'
import { DoctorTopBar } from './DoctorTopBar'

export function DoctorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-dvh bg-background">
      <DoctorSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DoctorTopBar onMenuClick={toggleSidebar} />
        <main id="main" className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
