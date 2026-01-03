import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const registerSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register: registerUser, loading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      setSuccess(false);
      await registerUser(data.email, data.password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (success) {
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

        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              ¡Registro exitoso!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tu cuenta ha sido creada. Por favor, verifica tu email si es necesario.
            </p>
            <button
              onClick={onToggleMode}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 dark:hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Crear Cuenta</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 dark:hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando cuenta...
              </div>
            ) : (
              <div className="flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Cuenta
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={onToggleMode}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
