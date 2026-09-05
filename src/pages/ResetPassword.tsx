import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async ({ password }: ResetPasswordForm) => {
    try {
      setLoading(true);
      setServerError('');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      window.history.replaceState({}, document.title, window.location.pathname);
      setSuccess(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8">
        {success ? (
          <div className="text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Contraseña actualizada</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ya puedes seguir usando Rendix con tu nueva contraseña.</p>
            <button
              type="button"
              onClick={() => { window.location.hash = '/dashboard'; }}
              className="mt-6 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
            >
              Ir al Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <KeyRound className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nueva contraseña</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ingresa una contraseña segura para tu cuenta.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(['password', 'confirmPassword'] as const).map((field, index) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {index === 0 ? 'Nueva contraseña' : 'Confirmar contraseña'}
                  </label>
                  <div className="relative">
                    <input
                      {...register(field)}
                      id={field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute inset-y-0 right-0 px-3 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors[field] && <p className="mt-1 text-xs text-red-500">{errors[field]?.message}</p>}
                </div>
              ))}

              {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? 'Actualizando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
