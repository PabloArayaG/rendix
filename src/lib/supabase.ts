import { createClient } from '@supabase/supabase-js';

// Variables de entorno de Vite para Supabase.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
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
export const getStoragePath = (storedPathOrUrl: string): string => {
  let decoded = storedPathOrUrl;
  try {
    decoded = decodeURIComponent(storedPathOrUrl);
  } catch {
    // Mantener el valor original si una URL histórica contiene un '%' inválido.
  }
  const markers = [
    '/storage/v1/object/public/receipts/',
    '/storage/v1/object/sign/receipts/',
  ];

  for (const marker of markers) {
    const markerIndex = decoded.indexOf(marker);
    if (markerIndex >= 0) {
      return decoded.substring(markerIndex + marker.length).split('?')[0];
    }
  }

  return decoded.replace(/^\/+/, '').split('?')[0];
};

export const getSignedStorageUrl = async (storedPathOrUrl: string): Promise<string> => {
  const filePath = getStoragePath(storedPathOrUrl);
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filePath, 60);

  if (error) throw error;
  return data.signedUrl;
};

export const openStorageFile = async (storedPathOrUrl: string): Promise<void> => {
  const previewWindow = window.open('about:blank', '_blank');

  try {
    const signedUrl = await getSignedStorageUrl(storedPathOrUrl);
    if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.location.href = signedUrl;
    } else {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    previewWindow?.close();
    window.alert(error instanceof Error ? error.message : 'No se pudo abrir el archivo');
  }
};

export const uploadReceipt = async (file: File, projectId: string, expenseId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${expenseId}_${Date.now()}.${fileExt}`;
  const filePath = `receipts/${projectId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file);

  if (error) throw error;

  return {
    path: data.path,
    url: data.path,
    filename: file.name
  };
};

export const deleteReceipt = async (storedPathOrUrl: string) => {
  const { error } = await supabase.storage
    .from('receipts')
    .remove([getStoragePath(storedPathOrUrl)]);

  if (error) throw error;
};

export const uploadProjectDocument = async (
  file: File,
  projectId: string,
  docType: 'purchase_order' | 'hes' | 'sale_invoice'
) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${docType}_${Date.now()}.${fileExt}`;
  const filePath = `projects/${projectId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  return { path: data.path, url: data.path, filename: file.name };
};

export const deleteProjectDocument = async (storedPathOrUrl: string) => {
  const { error } = await supabase.storage
    .from('receipts')
    .remove([getStoragePath(storedPathOrUrl)]);
  if (error) throw error;
};
