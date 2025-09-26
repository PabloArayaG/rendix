import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { AuthPage } from './auth/AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Mostrar loading mientras se inicializa
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando RENDIX...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar página de autenticación
  if (!user) {
    return <AuthPage />;
  }

  // Usuario autenticado, mostrar contenido protegido
  return <>{children}</>;
}
