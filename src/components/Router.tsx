import { useState, useEffect } from 'react';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { ProjectDetail } from '../pages/ProjectDetail';
import { Settings } from '../pages/Settings';

export function Router() {
  const [currentPath, setCurrentPath] = useState('/dashboard');

  useEffect(() => {
    // Obtener la ruta actual del hash
    const path = window.location.hash.replace('#', '') || '/dashboard';
    setCurrentPath(path);

    // Escuchar cambios en el hash
    const handleHashChange = () => {
      const newPath = window.location.hash.replace('#', '') || '/dashboard';
      setCurrentPath(newPath);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Función para navegación programática
  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  // Renderizar la página actual
  const renderCurrentPage = () => {
    // Manejar rutas con parámetros
    if (currentPath.startsWith('/projects/')) {
      const projectId = currentPath.split('/')[2];
      if (projectId) {
        return (
          <ProjectDetail 
            projectId={projectId} 
            onBack={() => navigate('/projects')}
          />
        );
      }
    }

    // Rutas simples
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
