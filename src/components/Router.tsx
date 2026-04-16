import { useState, useEffect } from 'react';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { ProjectDetailBeta } from '../pages/ProjectDetailBeta';
import { Settings } from '../pages/Settings';

export function Router() {
  const [currentPath, setCurrentPath] = useState('/dashboard');

  useEffect(() => {
    const path = window.location.hash.replace('#', '') || '/dashboard';
    setCurrentPath(path);

    const handleHashChange = () => {
      const newPath = window.location.hash.replace('#', '') || '/dashboard';
      setCurrentPath(newPath);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  const renderCurrentPage = () => {
    if (currentPath.startsWith('/projects/')) {
      const projectId = currentPath.split('/')[2];
      if (projectId) {
        return (
          <ProjectDetailBeta
            projectId={projectId}
            onBack={() => navigate('/projects')}
          />
        );
      }
    }

    switch (currentPath) {
      case '/dashboard':
        return <Dashboard />;
      case '/projects':
        return <Projects />;
      case '/settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      {renderCurrentPage()}
    </>
  );
}
