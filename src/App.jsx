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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/applicants"
            element={
              <ProtectedRoute>
                <ApplicantsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applicants/new"
            element={
              <ProtectedRoute>
                <AddApplicantPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applicants/:id"
            element={
              <ProtectedRoute>
                <ApplicantDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/branches"
            element={
              <ProtectedRoute>
                <BranchesPage />
              </ProtectedRoute>
            }
          />

          <Route
  path="/workflows"
  element={
    <ProtectedRoute>
      <WorkflowsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/workflows/:id"
  element={
    <ProtectedRoute>
      <WorkflowBuilderPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/reports"
  element={
    <ProtectedRoute>
      <ReportsPage />
    </ProtectedRoute>
  }
/>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 - Redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;