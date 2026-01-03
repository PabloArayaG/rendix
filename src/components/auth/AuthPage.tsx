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
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-black flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {isLogin ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <RegisterForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>

      {/* Lado derecho: Imagen (solo en desktop) */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-black"
        style={{
          backgroundImage: 'url(/background-rendix.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay para mejor contraste */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-blue-600/30"></div>
        
        {/* Contenido opcional sobre la imagen */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-lg text-center">
            <h2 className="text-5xl font-bold mb-6">Bienvenido a RENDIX</h2>
            <p className="text-xl text-white/90 leading-relaxed">
              Sistema profesional de gestión financiera para tus proyectos de construcción
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
