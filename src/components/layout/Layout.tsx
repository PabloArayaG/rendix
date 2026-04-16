import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [sidebarCollapsed] = useState(false);

  useEffect(() => {
    const updatePath = () => {
      setCurrentPath(window.location.hash.replace('#', '') || '/dashboard');
    };

    updatePath();
    window.addEventListener('hashchange', updatePath);
    return () => window.removeEventListener('hashchange', updatePath);
  }, []);

  const handleNavigation = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-black dark:to-gray-950">
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigation}
      />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <Header title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
