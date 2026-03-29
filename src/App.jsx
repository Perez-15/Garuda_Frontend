import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth & Dashboard
import LoginPage from './pages/Login/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';


import AddApplicantPage    from './pages/External/Applicants/AddApplicantPage';
import ApplicantDetailPage from './pages/External/Applicants/ApplicantDetailPage';
import InProcessPage       from './pages/External/Applicants/InProcessPage';

// External - Hired
import EmployedPage       from './pages/External/Hired/HiredPage';
import EmployeeDetailPage from './pages/External/Hired/Hireddetailpage';

// Internal
import InternalEmployeesPage from './pages/Internal/Internalemployeespage';
import UserProfilePage       from './pages/Internal/Userprofilepage.jsx';

// Other Pages
import ClientsPage         from './pages/Clients/ClientsPage';
import BranchesPage        from './pages/Branches/BranchesPage';
import WorkflowsPage       from './pages/Workflows/WorkflowsPage';
import WorkflowBuilderPage from './pages/Workflows/WorkflowBuilderPage';
import ReportsPage         from './pages/Reports/ReportsPage';
import PositionsPage       from './pages/Positions/PositionsPage';
import UsersPage           from './pages/Users/UsersPage';

// Attendance
import AttendancePage     from './pages/Attendance/Attendancepage';
import TeamAttendancePage from './pages/Attendance/Teamattendancepage';

// Manage Columns
import ManageColumnsPage from './pages/ManageColumn/Managecolumnspage';
import SchemaEditorPage  from './pages/ManageColumn/Schemaeditorpage';

// Performance
import PerformancePage from './pages/Performance/Performancepage';

// Recently Deleted
import RecentlyDeletedPage from './pages/RecentelyDeleted/Recentlydeletedpage';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public ─────────────────────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Dashboard ──────────────────────────────────────────────────── */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* ── Applicants ─────────────────────────────────────────────────── */}
          <Route path="/applicants/new" element={<ProtectedRoute><AddApplicantPage /></ProtectedRoute>} />
          <Route path="/applicants/:id" element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>} />

          {/* ── In-Process ─────────────────────────────────────────────────── */}
          <Route path="/in-process"     element={<ProtectedRoute><InProcessPage /></ProtectedRoute>} />
          <Route path="/in-process/:id" element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>} />

          {/* ── Hired / External Employees ─────────────────────────────────── */}
          <Route path="/employees"     element={<ProtectedRoute><EmployedPage /></ProtectedRoute>} />
          <Route path="/employees/:id" element={<ProtectedRoute><EmployeeDetailPage /></ProtectedRoute>} />

          {/* ── Internal Employees ─────────────────────────────────────────── */}
          <Route path="/internal/employees" element={<ProtectedRoute><InternalEmployeesPage /></ProtectedRoute>} />
          <Route path="/internal/users/:id" element={<UserProfilePage />} />

          {/* ── Attendance ─────────────────────────────────────────────────── */}
          <Route path="/attendance"      element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/team" element={<ProtectedRoute><TeamAttendancePage /></ProtectedRoute>} />

          {/* ── Clients ────────────────────────────────────────────────────── */}
          <Route path="/clients"  element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />

          {/* ── Branches ───────────────────────────────────────────────────── */}
          <Route path="/branches" element={<ProtectedRoute><BranchesPage /></ProtectedRoute>} />

          {/* ── Workflows ──────────────────────────────────────────────────── */}
          <Route path="/workflows"     element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowBuilderPage /></ProtectedRoute>} />

          {/* ── Users ──────────────────────────────────────────────────────── */}
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />

          {/* ── Reports ────────────────────────────────────────────────────── */}
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

          {/* ── Positions ──────────────────────────────────────────────────── */}
          <Route path="/positions" element={<ProtectedRoute><PositionsPage /></ProtectedRoute>} />

          {/* ── Manage Columns ─────────────────────────────────────────────── */}
          <Route path="/manage-columns"       element={<ProtectedRoute><ManageColumnsPage /></ProtectedRoute>} />
          <Route path="/manage-columns/:page" element={<ProtectedRoute><SchemaEditorPage /></ProtectedRoute>} />

          {/* ── Performance ────────────────────────────────────────────────── */}
          <Route path="/performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />

          
          {/* ── Recently Deleted (Admin only) ──────────────────────────────── */}
          <Route path="/recently-deleted" element={<ProtectedRoute><RecentlyDeletedPage /></ProtectedRoute>} />

          {/* ── Fallbacks ──────────────────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;