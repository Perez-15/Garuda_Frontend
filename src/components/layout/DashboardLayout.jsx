import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/Transparent_garuda.png';
import {
  LayoutDashboard,
  Users,
  Building2,
  Workflow,
  FileText,
  LogOut,
  Menu,
  X,
  MapPin,
  Briefcase,
  Users as UsersIcon,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserCog,
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userRole = user?.roles?.[0]?.name;
  const isTA = userRole === 'talent_acquisition';

  // ── Active check helpers ───────────────────────────────────────────────────
  const isActive     = (path) => location.pathname === path;
  const isStartsWith = (path) => location.pathname.startsWith(path);

  // ── Applicants group is "open" when on any applicant-related page ──────────
  const applicantsOpen = isStartsWith('/applicants') || isStartsWith('/on-process') || isStartsWith('/employees');

  // ── Navigation config ──────────────────────────────────────────────────────
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Positions',
      href: '/positions',
      icon: Briefcase,
    },
    // ── Applicants group (collapsible) ───────────────────────────────────────
    {
      name: 'Applicants',
      icon: Users,
      group: true,
      children: [
        {
          name: 'All Applicants',
          href: '/applicants',
          icon: Users,
          exact: true,
        },
        {
          name: 'In-Process',
          href: '/in-process',
          icon: UserCog,
        },
        {
          name: 'Employed',
          href: '/employees',
          icon: UserCheck,
        },
      ],
    },
    {
      name: 'Clients',
      href: '/clients',
      icon: Building2,
    },
    {
      name: 'Branches',
      href: '/branches',
      icon: MapPin,
    },
    ...(!isTA
      ? [
          { name: 'Process',  href: '/workflows', icon: Workflow },
          { name: 'Reports',  href: '/reports',   icon: FileText },
        ]
      : []),
    ...(userRole === 'super_admin' || userRole === 'hr_admin'
      ? [{ name: 'Users', href: '/users', icon: UsersIcon }]
      : []),
  ];

  // ── Reusable logo block ────────────────────────────────────────────────────
  const LogoBrand = () => (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Garuda HR"
        className="h-10 w-10 object-contain flex-shrink-0"
      />
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm leading-tight">Garuda HR</span>
        <span className="text-gray-400 text-xs leading-tight">Recruitment Agency</span>
      </div>
    </div>
  );

  // ── Nav item renderer (shared between desktop + mobile) ───────────────────
  const NavItem = ({ item, onLinkClick }) => {
    // Group item (collapsible)
    if (item.group) {
      const isGroupActive = applicantsOpen;
      return (
        <div>
          {/* Group header — not clickable, just visual */}
          <div
            className={`flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md cursor-default select-none
              ${isGroupActive ? 'text-white' : 'text-gray-300'}`}
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </div>
            {isGroupActive
              ? <ChevronDown className="h-4 w-4 text-gray-400" />
              : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </div>

          {/* Children — always visible when on any applicant page, otherwise shown too for easy nav */}
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700 pl-3">
            {item.children.map((child) => {
              const active = child.exact
                ? isActive(child.href)
                : isStartsWith(child.href) && child.href !== '/applicants'
                  ? true
                  : isActive(child.href);

              return (
                <Link
                  key={child.name}
                  to={child.href}
                  onClick={onLinkClick}
                  className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors
                    ${active
                      ? 'bg-gray-700 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  <child.icon className="mr-2.5 h-4 w-4 flex-shrink-0" />
                  {child.name}
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    // Regular item
    return (
      <Link
        to={item.href}
        onClick={onLinkClick}
        className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
          ${isActive(item.href)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
      >
        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-2">
              <LogoBrand />
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>

          {/* User footer */}
          <div className="flex-shrink-0 flex bg-gray-800 p-4">
            <div className="flex items-center w-full">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sidebar ───────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4 mb-2">
                  <LogoBrand />
                </div>
                <nav className="mt-5 px-2 space-y-1">
                  {navigation.map((item) => (
                    <NavItem
                      key={item.name}
                      item={item}
                      onLinkClick={() => setSidebarOpen(false)}
                    />
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white shadow">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}