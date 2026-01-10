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
      // Verifica a senha usando bcrypt
      const isPasswordValid = await window.electron.auth.verifyPassword(username, password);

      if (!isPasswordValid) {
        return false;
      }

      // Busca os dados completos do usuário
      const result = await window.electron.db.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
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
