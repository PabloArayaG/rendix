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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-black dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleMode={toggleMode} />
        ) : (
          <RegisterForm onToggleMode={toggleMode} />
        )}
      </div>
    </div>
  );
}
