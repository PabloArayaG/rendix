import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, AuthUser } from '../lib/supabase';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  
  // Organización activa
  activeOrganizationId: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setActiveOrganization: (organizationId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,
      activeOrganizationId: null,

  login: async (email: string, password: string) => {
    // NO cambiar loading global para evitar re-renders
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Manejar errores específicos de autenticación
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Contraseña incorrecta');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Confirma tu email antes de iniciar sesión');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Demasiados intentos. Espera unos minutos');
        } else {
          // Solo hacer log de errores inesperados
          console.error('Error inesperado en login:', error);
          throw new Error('Error de autenticación');
        }
      }

      if (data.user) {
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email || '',
            created_at: data.user.created_at || ''
          }
        });
      }
    } catch (error) {
      // Re-lanzar el error sin hacer log adicional
      // (el log ya se hizo arriba si era necesario)
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email || '',
            created_at: data.user.created_at || ''
          }
        });
      }
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ user: null, activeOrganizationId: null });
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setActiveOrganization: (organizationId: string) => {
    set({ activeOrganizationId: organizationId });
  },

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ 
          user: {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || ''
          }
        });
      }

      // Escuchar cambios de autenticación
      supabase.auth.onAuthStateChange((event, session) => {
        // Solo actualizar el estado si el evento es SIGNED_IN o SIGNED_OUT explícito
        // Esto evita que se limpie el estado en errores de login
        if (event === 'SIGNED_IN' && session?.user) {
          set({ 
            user: {
              id: session.user.id,
              email: session.user.email || '',
              created_at: session.user.created_at || ''
            }
          });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null });
        }
      });
      
      set({ initialized: true });
    } catch (error) {
      console.error('Error inicializando auth:', error);
    } finally {
      set({ loading: false });
    }
  },
}),
    {
      name: 'rendix-auth-storage',
      partialize: (state) => ({ 
        activeOrganizationId: state.activeOrganizationId 
      }),
    }
  )
);
