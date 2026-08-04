import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/context/ThemeContext"
import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { AppLayout } from "@/components/layout/AppLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { ChatPage } from "@/pages/ChatPage"
import { EmployeesPage } from "@/pages/EmployeesPage"
import { LeaveApprovalsPage } from "@/pages/LeaveApprovalsPage"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { TicketsPage } from "@/pages/TicketsPage"
import { AnalyticsPage } from "@/pages/AnalyticsPage"
import { MyTicketsPage } from "@/pages/MyTicketsPage"
import { ITTicketsPage } from "@/pages/ITTicketsPage"
import { UsersPage } from "@/pages/UsersPage"
import { SettingsPage } from "@/pages/SettingsPage"

/** Role sets — these mirror the server's requireRole guards. */
const HR_ONLY = ["hr", "admin"] as const
const IT_ONLY = ["it_support", "admin"] as const
const ADMIN_ONLY = ["admin", "super_admin"] as const

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated shell — everything below requires a valid session */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Any signed-in user */}
              <Route index element={<DashboardPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="my-tickets" element={<MyTicketsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* HR */}
              <Route
                path="employees"
                element={<ProtectedRoute roles={[...HR_ONLY]}><EmployeesPage /></ProtectedRoute>}
              />
              <Route
                path="leave-approvals"
                element={<ProtectedRoute roles={[...HR_ONLY]}><LeaveApprovalsPage /></ProtectedRoute>}
              />
              <Route
                path="documents"
                element={<ProtectedRoute roles={[...HR_ONLY]}><DocumentsPage /></ProtectedRoute>}
              />
              <Route
                path="tickets"
                element={<ProtectedRoute roles={[...HR_ONLY]}><TicketsPage /></ProtectedRoute>}
              />
              <Route
                path="analytics"
                element={<ProtectedRoute roles={[...HR_ONLY]}><AnalyticsPage /></ProtectedRoute>}
              />

              {/* IT Support */}
              <Route
                path="it-tickets"
                element={<ProtectedRoute roles={[...IT_ONLY]}><ITTicketsPage /></ProtectedRoute>}
              />

              {/* Admin */}
              <Route
                path="users"
                element={<ProtectedRoute roles={[...ADMIN_ONLY]}><UsersPage /></ProtectedRoute>}
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
