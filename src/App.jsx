import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute, { ROLES } from './components/auth/ProtectedRoute';

// Auth & Dashboard
import LoginPage from './pages/Login/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';

// External - Applicants
import AddApplicantPage    from './pages/External/Applicants/AddApplicantPage';
import ApplicantDetailPage from './pages/External/Applicants/ApplicantDetailPage';
import InProcessPage       from './pages/External/Applicants/InProcessPage';

// External - Hired
import EmployedPage       from './pages/External/Hired/HiredPage';
import EmployeeDetailPage from './pages/External/Hired/Hireddetailpage';

// Internal
import InternalEmployeesPage from './pages/Internal/Internalemployeespage';
import UserProfilePage       from './pages/Internal/Userprofilepage.jsx';

// Clients
import ClientsPage         from './pages/Clients/ClientsPage';
import ClientProspectsPage from './pages/Clients/Clientprospectspage';

// Branches
import BranchesPage from './pages/Branches/BranchesPage';

// Workflows
import WorkflowsPage       from './pages/Workflows/WorkflowsPage';
import WorkflowBuilderPage from './pages/Workflows/WorkflowBuilderPage';

// Reports
import ReportsPage from './pages/Reports/ReportsPage';

// Positions
import PositionsPage from './pages/Positions/PositionsPage.jsx';

// Users
import UsersPage from './pages/Users/UsersPage';

// Attendance
import AttendancePage     from './pages/Attendance/Attendancepage';
import TeamAttendancePage from './pages/Attendance/Teamattendancepage';

// Performance
import PerformancePage from './pages/Performance/Performancepage';

// Recently Deleted
import RecentlyDeletedPage from './pages/RecentelyDeleted/Recentlydeletedpage';

// Website Applications
import WebsiteApplicationsPage from './pages/Marketing/WebsiteApplicationsPage';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public ─────────────────────────────────────────────────────────
              No auth required. If already logged in, LoginPage should redirect
              to /dashboard on its own after checking auth state.            */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Dashboard — ALL roles ──────────────────────────────────────────
              Every authenticated user lands here after login.               */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* ── Positions — ADMIN + TA ─────────────────────────────────────────
              Accounting and marketing cannot access this.                   */}
          <Route path="/positions" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <PositionsPage />
            </ProtectedRoute>
          } />

          {/* ── Applicants — ADMIN + TA ────────────────────────────────────────
              Only recruitment-facing roles manage applicants.               */}
          <Route path="/applicants/new" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <AddApplicantPage />
            </ProtectedRoute>
          } />
          <Route path="/applicants/:id" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <ApplicantDetailPage />
            </ProtectedRoute>
          } />

          {/* ── In-Process — ADMIN + TA ────────────────────────────────────────*/}
          <Route path="/in-process" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <InProcessPage />
            </ProtectedRoute>
          } />
          <Route path="/in-process/:id" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <ApplicantDetailPage />
            </ProtectedRoute>
          } />

          {/* ── Hired / External Employees — ADMIN + TA ────────────────────────*/}
          <Route path="/employees" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <EmployedPage />
            </ProtectedRoute>
          } />
          <Route path="/employees/:id" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <EmployeeDetailPage />
            </ProtectedRoute>
          } />

        <Route path="/internal/employees" element={
          <ProtectedRoute>
            <InternalEmployeesPage />
          </ProtectedRoute>
        } />
        <Route path="/internal/users/:id" element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        } />

          {/* ── Attendance (own) — ALL roles ───────────────────────────────────
              Every employee can view their own attendance.                  */}
          <Route path="/attendance" element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          } />

          {/* ── Attendance (team) — ADMIN + ACCOUNTING ─────────────────────────
              TA and marketing cannot view other people's attendance.        */}
          <Route path="/attendance/team" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_ACCOUNTING}>
              <TeamAttendancePage />
            </ProtectedRoute>
          } />

        {/* Clients — ALL authenticated roles including marketing */}
<Route path="/clients" element={
  <ProtectedRoute>
    <ClientsPage />
  </ProtectedRoute>
} />
<Route path="/clients/prospects" element={
  <ProtectedRoute allowedRoles={['super_admin', 'hr_admin', 'marketing']}>
    <ClientProspectsPage />
  </ProtectedRoute>
} />

          {/* ── Branches — ALL roles ───────────────────────────────────────────
              Every authenticated role including marketing can view branches. */}
          <Route path="/branches" element={
            <ProtectedRoute>
              <BranchesPage />
            </ProtectedRoute>
          } />

          {/* ── Workflows — ADMIN + TA ─────────────────────────────────────────
              Accounting and marketing cannot manage workflows.              */}
          <Route path="/workflows" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <WorkflowsPage />
            </ProtectedRoute>
          } />
          <Route path="/workflows/:id" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <WorkflowBuilderPage />
            </ProtectedRoute>
          } />

          {/* ── Reports — ADMIN + TA ───────────────────────────────────────────
              Accounting and marketing cannot access reports.               */}
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <ReportsPage />
            </ProtectedRoute>
          } />

          {/* ── Website Applications — ADMIN + TA ─────────────────────────────
              Only recruitment-facing roles handle incoming applications.    */}
          <Route path="/website-applications" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN_TA}>
              <WebsiteApplicationsPage />
            </ProtectedRoute>
          } />

          {/* ── Performance — ADMIN only ───────────────────────────────────────*/}
          <Route path="/performance" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN}>
              <PerformancePage />
            </ProtectedRoute>
          } />

          {/* ── Users — ADMIN only ─────────────────────────────────────────────
              Only admins can manage system users.                           */}
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN}>
              <UsersPage />
            </ProtectedRoute>
          } />

          {/* ── Recently Deleted — ADMIN only ──────────────────────────────────
              Only admins can restore or permanently delete records.         */}
          <Route path="/recently-deleted" element={
            <ProtectedRoute>
              <RecentlyDeletedPage />
            </ProtectedRoute>
          } />

          {/* ── Fallbacks ──────────────────────────────────────────────────────
              Root redirects to dashboard.
              Any unknown URL also redirects to dashboard instead of a 404. */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;