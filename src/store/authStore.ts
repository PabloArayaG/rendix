import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, AuthUser } from '../lib/supabase';

let authListenerRegistered = false;

const toAuthUser = (user: { id: string; email?: string; created_at?: string }): AuthUser => ({
  id: user.id,
  email: user.email || '',
  created_at: user.created_at || '',
});

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  
  // Organización activa
  activeOrganizationId: string | null;
  
  // Tema
  isDarkMode: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setActiveOrganization: (organizationId: string) => void;
  toggleDarkMode: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,
      activeOrganizationId: null,
      isDarkMode: false,

  login: async (email: string, password: string) => {
    // NO cambiar loading global para evitar re-renders
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Contraseña incorrecta');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Confirma tu email antes de iniciar sesión');
      } else if (error.message.includes('Too many requests')) {
        throw new Error('Demasiados intentos. Espera unos minutos');
      }
      console.error('Error inesperado en login:', error);
      throw new Error('Error de autenticación');
    }

    if (data.user) {
      set({ user: toAuthUser(data.user) });
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

      if (data.session?.user) {
        set({ 
          user: {
            id: data.session.user.id,
            email: data.session.user.email || '',
            created_at: data.session.user.created_at || ''
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

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    
    // Aplicar o quitar la clase 'dark' del document
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: toAuthUser(session.user) });

        if (new URLSearchParams(window.location.search).get('recovery') === '1') {
          window.location.hash = '/reset-password';
        }
      }

      if (!authListenerRegistered) {
        authListenerRegistered = true;
        supabase.auth.onAuthStateChange((event, nextSession) => {
          if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && nextSession?.user) {
            set({ user: toAuthUser(nextSession.user) });
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, activeOrganizationId: null });
          }

          if (event === 'PASSWORD_RECOVERY') {
            window.location.hash = '/reset-password';
          }
        });
      }
      
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
        activeOrganizationId: state.activeOrganizationId,
        isDarkMode: state.isDarkMode
      }),
    }
  )
);
