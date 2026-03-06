import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import ApplicantsPage from './pages/Applicants/ApplicantsPage';
import AddApplicantPage from './pages/Applicants/AddApplicantPage';
import ApplicantDetailPage from './pages/Applicants/ApplicantDetailPage';
import ClientsPage from './pages/Clients/ClientsPage';
import BranchesPage from './pages/Branches/BranchesPage';
import WorkflowsPage from './pages/Workflows/WorkflowsPage';
import WorkflowBuilderPage from './pages/Workflows/WorkflowBuilderPage';
import ReportsPage from './pages/Reports/ReportsPage';
import PositionsPage from './pages/Positions/PositionsPage';
import UsersPage from './pages/Users/UsersPage';
import InProcessPage from './pages/Applicants/InProcessPage';
import EmployedPage from './pages/Employees/HiredPage';
import EmployeeDetailPage from './pages/Employees/Hireddetailpage';

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
          <Route path="/applicants"      element={<ProtectedRoute><ApplicantsPage /></ProtectedRoute>} />
          <Route path="/applicants/new"  element={<ProtectedRoute><AddApplicantPage /></ProtectedRoute>} />
          <Route path="/applicants/:id"  element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>} />

          {/* ── In-Process (active applicants filtered view) ────────────────── */}
          <Route path="/in-process"      element={<ProtectedRoute><InProcessPage /></ProtectedRoute>} />
          <Route path="/in-process/:id"  element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>} />

          {/* ── Employees ──────────────────────────────────────────────────── */}
          <Route path="/employees"       element={<ProtectedRoute><EmployedPage /></ProtectedRoute>} />
          <Route path="/employees/:id"   element={<ProtectedRoute><EmployeeDetailPage /></ProtectedRoute>} />

          {/* ── Clients ────────────────────────────────────────────────────── */}
          <Route path="/clients"         element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />

          {/* ── Branches ───────────────────────────────────────────────────── */}
          <Route path="/branches"        element={<ProtectedRoute><BranchesPage /></ProtectedRoute>} />

          {/* ── Workflows ──────────────────────────────────────────────────── */}
          <Route path="/workflows"       element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/workflows/:id"   element={<ProtectedRoute><WorkflowBuilderPage /></ProtectedRoute>} />

          {/* ── Users ──────────────────────────────────────────────────────── */}
          <Route path="/users"           element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />

          {/* ── Reports ────────────────────────────────────────────────────── */}
          <Route path="/reports"         element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

          {/* ── Positions ──────────────────────────────────────────────────── */}
          <Route path="/positions"       element={<ProtectedRoute><PositionsPage /></ProtectedRoute>} />

          {/* ── Fallbacks ──────────────────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;