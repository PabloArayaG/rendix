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
    <div className="min-h-screen flex overflow-hidden">
      {/* Lado izquierdo: Formulario */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-black flex flex-col">
        {/* Banner superior */}
        <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-900 py-2 px-4 text-center">
          <p className="text-white text-xs font-medium">
            Bienvenido a RENDIX - Sistema profesional de gestión financiera para tus proyectos de construcción
          </p>
        </div>
        
        {/* Formulario centrado */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {isLogin ? (
              <LoginForm onToggleMode={toggleMode} />
            ) : (
              <RegisterForm onToggleMode={toggleMode} />
            )}
          </div>
        </div>
      </div>

      {/* Lado derecho: Imagen (solo en desktop) */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-black"
        style={{
          backgroundImage: 'url(/3d-illustration-green-sprout-with-golden-coins.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay sutil para darle profundidad */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-blue-900/10"></div>
      </div>
    </div>
  );
}
