import { create } from 'zustand';
import { supabase, AuthUser } from '../lib/supabase';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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
      console.error('Error en login:', error);
      throw error;
    } finally {
      set({ loading: false });
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
      
      set({ user: null });
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
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
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({ 
            user: {
              id: session.user.id,
              email: session.user.email || '',
              created_at: session.user.created_at || ''
            }
          });
        } else {
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
}));
