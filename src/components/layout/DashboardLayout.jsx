import { useState, useEffect } from 'react';
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
  Clock,
  Settings2,
  TrendingUp,
  Trash2,
  Globe,
} from 'lucide-react';
import websiteApplicationService from '../../services/websiteApplicationService';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userRole = user?.roles?.[0]?.name;
  const isTA     = userRole === 'talent_acquisition';
  const isAdmin  = userRole === 'super_admin' || userRole === 'hr_admin';

  // ── Fetch pending website applications count for badge ─────────────────────
  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const res = await websiteApplicationService.getPendingCount();
        setPendingCount(res.data.count);
      } catch {
        // silently fail — badge just won't show
      }
    };
    fetchBadge();
    const interval = setInterval(fetchBadge, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // ── Active check helpers ───────────────────────────────────────────────────
  const isActive     = (path) => location.pathname === path;
  const isStartsWith = (path) => location.pathname.startsWith(path);
const clientsOpen = isStartsWith('/clients');
  // ── Route-based group open state ───────────────────────────────────────────
  const applicantsOpen =
    isStartsWith('/applicants') ||
    isStartsWith('/in-process') ||
    isStartsWith('/employees');
  const attendanceOpen = isStartsWith('/attendance');
  const settingsOpen =
    isStartsWith('/clients')         ||
    isStartsWith('/branches')        ||
    isStartsWith('/manage-columns')  ||
    isStartsWith('/workflows')       ||
    isStartsWith('/recently-deleted');

  // ── Lifted group toggle state (keyed by group name) ────────────────────────
  const [openGroups, setOpenGroups] = useState({
    External:   applicantsOpen,
    Attendance: attendanceOpen,
    Settings:   settingsOpen,
  });

  const toggleGroup = (name) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));

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
    {
      name: 'External',
      icon: Users,
      group: true,
      children: [
        { name: 'In-Process', href: '/in-process', icon: UserCog   },
        { name: 'Employed',   href: '/employees',  icon: UserCheck },
      ],
    },
    {
      name: 'Internal',
      href: '/internal/employees',
      icon: UsersIcon,
    },

    ...(isAdmin
      ? [{ name: 'Performance', href: '/performance', icon: TrendingUp }]
      : []),

    {
      name: 'Attendance',
      icon: Clock,
      group: true,
      children: [
        { name: 'My Attendance', href: '/attendance', icon: Clock, exact: true },
        ...(
          ['super_admin', 'hr_admin', 'accounting'].includes(userRole)
            ? [{ name: 'Team View', href: '/attendance/team', icon: UsersIcon }]
            : []
        ),
      ],
    },

    ...(!isTA
      ? [{ name: 'Reports', href: '/reports', icon: FileText }]
      : []),

    ...(isAdmin
      ? [{ name: 'Users', href: '/users', icon: UsersIcon }]
      : []),

    
    {
          name: 'Website Applications',
          href: '/website-applications',
          icon: Globe,
          badge: pendingCount,
        },


{
  name: 'Clients',
  icon: Building2,
  group: true,
  children: [
    { name: 'All Clients', href: '/clients', icon: Building2 },
    { name: 'Prospects', href: '/clients/prospects', icon: Users },
  ],
},

{
  name: 'Settings',
  icon: Settings2,
  group: true,
  children: [
    { name: 'Branches', href: '/branches', icon: MapPin },

    ...(!isTA
      ? [{ name: 'Process', href: '/workflows', icon: Workflow }]
      : []),

    {
      name: 'Recently Deleted',
      href: '/recently-deleted',
      icon: Trash2,
    },
  ],
},
  ];

  // ── Logo ───────────────────────────────────────────────────────────────────
  const LogoBrand = () => (
    <div className="flex items-center gap-3">
      <img src={logo} alt="Garuda HR" className="h-10 w-10 object-contain flex-shrink-0" />
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm leading-tight">Garuda</span>
        <span className="text-gray-400 text-xs leading-tight">Recruitment Agency</span>
      </div>
    </div>
  );

  // ── Nav item renderer ──────────────────────────────────────────────────────
  const NavItem = ({ item, onLinkClick }) => {
    if (item.group) {
      const isGroupActive =
        item.name === 'External'   ? applicantsOpen :
        item.name === 'Attendance' ? attendanceOpen :
        item.name === 'Clients'    ? isStartsWith('/clients') :
        item.name === 'Settings'   ? settingsOpen   :
        false;
        

      const isOpen = openGroups[item.name] || isGroupActive;

      return (
        <div>
          <button
            onClick={() => toggleGroup(item.name)}
            className={`w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors
              ${isGroupActive
                ? 'text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </div>
            {isOpen
              ? <ChevronDown  className="h-4 w-4 text-gray-400" />
              : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>

          {isOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700 pl-3">
              {item.children.map((child) => {
                const active = child.exact
                  ? isActive(child.href)
                  : isStartsWith(child.href) && child.href !== '/applicants'
                    ? true
                    : isActive(child.href);

                const isDeleted = child.href === '/recently-deleted';

                return (
                  <Link
                    key={child.name}
                    to={child.href}
                    onClick={onLinkClick}
                    className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors
                      ${active
                        ? isDeleted
                          ? 'bg-red-900/40 text-red-300 font-medium'
                          : 'bg-gray-700 text-white font-medium'
                        : isDeleted
                          ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <child.icon className="mr-2.5 h-4 w-4 flex-shrink-0" />
                    {child.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular link (with optional badge)
    return (
      <Link
        to={item.href}
        onClick={onLinkClick}
        className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
          ${isActive(item.href)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
      >
        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{item.name}</span>
        {item.badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Desktop sidebar */}
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

      {/* Mobile sidebar */}
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

      {/* Main content */}
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