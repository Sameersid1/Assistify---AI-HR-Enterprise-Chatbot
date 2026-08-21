import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/context/ThemeContext"
import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage } from "@/pages/LoginPage"
import { ActivationPage } from "@/pages/ActivationPage"
import { AppLayout } from "@/components/layout/AppLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { ApplyLeavePage } from "@/pages/ApplyLeavePage"
import { ChatPage } from "@/pages/ChatPage"
import { EmployeesPage } from "@/pages/EmployeesPage"
import { LeaveApprovalsPage } from "@/pages/LeaveApprovalsPage"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { QuestionsPage } from "@/pages/QuestionsPage"
import { AuditLogPage } from "@/pages/AuditLogPage"
import { UsersPage } from "@/pages/UsersPage"

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
            {/* ── Public ────────────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Activation must stay public — the invitee has no session yet.
                The server generates links as /activate?token=<hex>, so the
                query form is the one that actually gets used; the /:token
                path variant is kept as a convenience alias. */}
            <Route path="/activate" element={<ActivationPage />} />
            <Route path="/activate/:token" element={<ActivationPage />} />

            {/* ── Authenticated shell ───────────────────────────────────── */}
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
              <Route path="documents" element={<DocumentsPage />} />
              {/* Both sides live here: approvers get the queue, everyone else
                  gets their own questions. The server decides which. */}
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="apply-leave" element={<ApplyLeavePage />} />

              {/* HR */}
              <Route
                path="employees"
                element={<ProtectedRoute roles={[...HR_ONLY]}><EmployeesPage /></ProtectedRoute>}
              />
              <Route
                path="leave-approvals"
                element={<ProtectedRoute roles={[...HR_ONLY]}><LeaveApprovalsPage /></ProtectedRoute>}
              />

              {/* Admin */}
              <Route
                path="users"
                element={<ProtectedRoute roles={[...ADMIN_ONLY]}><UsersPage /></ProtectedRoute>}
              />
              <Route
                path="audit"
                element={<ProtectedRoute roles={[...ADMIN_ONLY]}><AuditLogPage /></ProtectedRoute>}
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
