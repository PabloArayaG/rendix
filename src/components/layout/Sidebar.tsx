import { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Building2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'projects',
    label: 'Proyectos',
    icon: FolderOpen,
    href: '/projects',
  },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const isCollapsed = false; // Sidebar always expanded
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleNavigation = (href: string) => {
    window.location.hash = href;
    onNavigate(href);
    setIsMobileOpen(false); // Cerrar sidebar en mobile
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-600 to-blue-700 dark:from-black dark:to-gray-950 shadow-xl border-r dark:border-gray-900">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-white">RENDIX</h1>
                <p className="text-xs text-blue-100">Gestión Financiera</p>
              </div>
            )}
          </div>
          
          {/* Desktop collapse button - DISABLED */}
          {/* <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Menu className="h-4 w-4 text-white/80" />
          </button> */}

          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-blue-200'}`} />
              {!isCollapsed && (
                <>
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-blue-500/20">
        {!isCollapsed && user && (
          <div className="mb-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg">
            <p className="text-sm font-medium text-white truncate">
              {user.email}
            </p>
            <p className="text-xs text-blue-100">Usuario conectado</p>
          </div>
        )}
        
        <div className="space-y-2">
          <button
            onClick={() => handleNavigation('/settings')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
              currentPath === '/settings'
                ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings className={`h-5 w-5 ${currentPath === '/settings' ? 'text-white' : 'text-blue-200'}`} />
            {!isCollapsed && <span>Configuración</span>}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg border border-blue-500 transition-colors"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>
    </>
  );
}
