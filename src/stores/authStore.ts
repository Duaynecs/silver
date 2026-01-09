import type { User } from '@/types';
import { mapDbToType } from '@/utils/dbMapper';
import { create } from 'zustand';
import { useCompaniesStore } from './companiesStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const result = await window.electron.db.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password]
      );

      if (result && result.length > 0) {
        const user = mapDbToType<User>(result[0]);
        set({ user, isAuthenticated: true });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout: () => {
    // Limpa a autenticação
    set({ user: null, isAuthenticated: false });

    // Limpa a empresa selecionada
    useCompaniesStore.getState().setCurrentCompany(null);
  },
}));
