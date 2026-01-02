import { Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useAuthStore();

  // Aplicar dark mode al cargar si estaba guardado
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={toggleDarkMode}
      className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200"
      aria-label="Toggle dark mode"
    >
      <div className="relative w-5 h-5">
        {/* Sol - visible en dark mode */}
        <Sun 
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDarkMode 
              ? 'rotate-0 scale-100 opacity-100' 
              : 'rotate-90 scale-0 opacity-0'
          }`}
        />
        {/* Luna - visible en light mode */}
        <Moon 
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            !isDarkMode 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </div>
    </button>
  );
}

