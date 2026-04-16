import { Bell, User, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { OrganizationSelector } from '../organizations/OrganizationSelector';
import { ThemeToggle } from '../ui/ThemeToggle';

function startTour() {
  localStorage.removeItem('rendix_tour_completed_v1');
  window.dispatchEvent(new CustomEvent('rendix:start-tour'));
}

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Title section */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Organization Selector */}
          <OrganizationSelector />
          
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Help / Tour button */}
          <button
            onClick={startTour}
            title="Ver tutorial de la aplicación"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800/50 transition-colors text-sm font-medium"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
