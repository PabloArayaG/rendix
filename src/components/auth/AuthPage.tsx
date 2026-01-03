import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  // Forzar dark mode en la página de login
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Limpiar cuando se desmonte (aunque no debería pasar)
    return () => {
      // No remover la clase, dejar que el usuario decida dentro de la app
    };
  }, []);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-black flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'var(--auth-bg-image)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay oscuro para mejor legibilidad en dark mode */}
      <div className="hidden dark:block absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      {/* Contenido */}
      <div className="relative z-10 w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleMode={toggleMode} />
        ) : (
          <RegisterForm onToggleMode={toggleMode} />
        )}
      </div>
    </div>
  );
}
