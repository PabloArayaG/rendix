import { useState, useEffect } from 'react';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { ProjectDetail } from '../pages/ProjectDetail';
import { Expenses } from '../pages/Expenses';

// Páginas placeholder para desarrollo
const PlaceholderPage = ({ title, subtitle }: { title: string; subtitle: string }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{subtitle}</p>
        <p className="text-sm text-gray-500">Esta página estará disponible próximamente</p>
      </div>
    </div>
  );
};

const Reports = () => (
  <PlaceholderPage 
    title="Reportes" 
    subtitle="Analiza el rendimiento financiero de tus proyectos" 
  />
);

const Settings = () => (
  <PlaceholderPage 
    title="Configuración" 
    subtitle="Ajusta las preferencias de tu aplicación" 
  />
);

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
      case '/expenses':
        return <Expenses />;
      case '/reports':
        return <Reports />;
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
