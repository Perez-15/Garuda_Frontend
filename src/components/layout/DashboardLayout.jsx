import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase } from 'lucide-react';
import { Users as UsersIcon } from 'lucide-react';
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Positions', href: '/positions', icon: Briefcase },
    { name: 'Applicants', href: '/applicants', icon: Users },
    { name: 'Clients', href: '/clients', icon: Building2 },
    { name: 'Branches', href: '/branches', icon: MapPin },

    ...(!isTA ? [
      { name: 'Workflows', href: '/workflows', icon: Workflow },
      { name: 'Reports', href: '/reports', icon: FileText },
    ] : []),

    ...(userRole === 'super_admin' || userRole === 'hr_admin'
      ? [{ name: 'Users', href: '/users', icon: UsersIcon }]
      : []),
  ];

  const isActive = (path) => location.pathname === path;

  // Reusable logo + brand block used in both sidebars
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-2">
              <LogoBrand />
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <Icon className="mr-3 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex bg-gray-800 p-4">
            <div className="flex items-center w-full">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 p-2 text-gray-400 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 flex z-40">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
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
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`${
                          isActive(item.href)
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                      >
                        <Icon className="mr-4 h-6 w-6" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
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