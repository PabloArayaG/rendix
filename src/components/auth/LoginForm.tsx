import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, ArrowLeft, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

const loginSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetError('Ingresa tu email');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/?recovery=1`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch {
      setResetError('Error al enviar el email. Verifica que el email sea correcto.');
    } finally {
      setResetLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setAuthError('');
    setIsLoading(true);
    try {
      await login(data.email, data.password);
    } catch {
      setAuthError('Contraseña o email inválido, reintentar nuevamente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <img 
            src="/Rendix-favicon.png" 
            alt="RENDIX Logo" 
            className="w-16 h-16"
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">RENDIX</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Sistema de Gestión Financiera</p>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">

        {/* Vista de recuperar contraseña */}
        {showForgotPassword ? (
          <div>
            <button
              onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(''); setResetEmail(''); }}
              className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al login
            </button>

            <h2 className="text-2xl font-semibold text-center mb-2 text-gray-900 dark:text-white">Recuperar contraseña</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Te enviaremos un enlace para restablecer tu contraseña
            </p>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-green-600" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">Email enviado</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Revisa tu bandeja de entrada en <span className="font-medium text-gray-700 dark:text-gray-300">{resetEmail}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="tu@email.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  />
                </div>

                {resetError && (
                  <p className="text-sm text-red-600">{resetError}</p>
                )}

                <button
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar enlace de recuperación
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Vista de login normal */
          <>
            <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-white">Iniciar Sesión</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 dark:hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="h-4 w-4 mr-2" />
                    Iniciar Sesión
                  </div>
                )}
              </button>
            </form>

            {authError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
                {authError}
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿No tienes cuenta?{' '}
                <button
                  onClick={onToggleMode}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
