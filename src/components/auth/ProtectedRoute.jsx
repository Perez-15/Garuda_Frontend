import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Every valid role in the system.
// Any role string not in this list is treated as invalid or tampered.
const KNOWN_ROLES = [
  'super_admin',
  'hr_admin',
  'talent_acquisition',
  'marketing',
  'accounting',
];

/**
 * Role groups — single source of truth.
 * Always import ROLES from here instead of writing raw arrays in App.jsx.
 * That way if a role name ever changes, you fix it in one place only.
 *
 * ADMIN          — super_admin, hr_admin
 * ADMIN_TA       — super_admin, hr_admin, talent_acquisition
 * ADMIN_ACCOUNTING — super_admin, hr_admin, accounting
 * NON_MARKETING  — super_admin, hr_admin, talent_acquisition, accounting
 * ALL            — every authenticated role including marketing
 */
export const ROLES = {
  ADMIN:             ['super_admin', 'hr_admin'],
  ADMIN_TA:          ['super_admin', 'hr_admin', 'talent_acquisition'],
  ADMIN_ACCOUNTING:  ['super_admin', 'hr_admin', 'accounting'],
  NON_MARKETING:     ['super_admin', 'hr_admin', 'talent_acquisition', 'accounting'],
  ALL:               [...KNOWN_ROLES],
};

/**
 * ProtectedRoute
 *
 * Two-gate access control:
 *   Gate 1 — Authentication: is the user logged in?
 *   Gate 2 — Authorization:  is the user's role in the allowedRoles list?
 *                             (only enforced when allowedRoles is provided)
 *
 * Props:
 *   children     — the page to render if access is granted
 *   allowedRoles — optional string[]. If omitted, any logged-in user passes.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  // Wait for auth state to resolve before making any decision.
  // Without this, a page refresh briefly redirects authenticated
  // users to /login before the session is restored.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Gate 1 — Authentication
  // If the user is not logged in, send them to the login page.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Gate 2 — Authorization
  // Only runs when allowedRoles is explicitly provided on the route.
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.roles?.[0]?.name;

    // Reject if the role is missing or not a recognized system role.
    // This prevents a manipulated user object from bypassing the check.
    const isKnownRole  = KNOWN_ROLES.includes(userRole);
    const isAuthorized = isKnownRole && allowedRoles.includes(userRole);

    if (!isAuthorized) {
      // Redirect unauthorized users to dashboard instead of a blank page.
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}