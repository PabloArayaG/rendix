import { createClient } from '@supabase/supabase-js';

// Variables de entorno para Supabase
// Soporte para Vite (desarrollo) y Next.js/Vercel (producción)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// DEBUG: Log temporal para verificar qué URL está usando
console.log('🔍 SUPABASE DEBUG:', {
  url: supabaseUrl,
  environment: process.env.NODE_ENV,
  isStaging: supabaseUrl?.includes('lkqjqvzddqsvgyxkvjcf'),
  hasViteEnv: !!import.meta.env?.VITE_SUPABASE_URL,
  hasNextEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente de Supabase con configuración optimizada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Tipos para auth
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

// Helper para obtener el usuario actual
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email || '',
    created_at: user.created_at || ''
  };
};

// Helper para el ID del usuario actual
export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

// Storage helpers
export const uploadReceipt = async (file: File, projectId: string, expenseId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${expenseId}_${Date.now()}.${fileExt}`;
  const filePath = `receipts/${projectId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file);

  if (error) throw error;

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath);

  return {
    path: data.path,
    url: publicUrl,
    filename: file.name
  };
};

export const deleteReceipt = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('receipts')
    .remove([filePath]);

  if (error) throw error;
};
