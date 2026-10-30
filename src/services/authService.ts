import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  IdTokenResult,
} from 'firebase/auth';
import { auth } from '@/firebase/config';

export interface AdminAuthResult {
  user: User;
  claims: Record<string, unknown>;
  isAdmin: boolean;
}

export const AuthService = {
  /**
   * Garante a sessão anônima do público (passos 1 a 3 do fluxo)
   * Persiste no navegador sem exigir qualquer cadastro de e-mail ou senha.
   */
  async ensureAnonymousUser(): Promise<User> {
    if (auth.currentUser) {
      return auth.currentUser;
    }

    try {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    } catch (error) {
      console.error('Erro ao autenticar usuário anonimamente:', error);
      throw error;
    }
  },

  /**
   * Autenticação administrativa com validação rigorosa de Custom Claims no servidor
   * Impede que qualquer usuário seja considerado admin sem a permissão formal validada.
   */
  async signInAdmin(email: string, pass: string): Promise<AdminAuthResult> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const user = credential.user;

      // Forçar atualização do token para ler custom claims do servidor
      const tokenResult: IdTokenResult = await user.getIdTokenResult(true);

      const claims = tokenResult.claims;
      const isAdmin =
        claims.admin === true ||
        claims.role === 'admin' ||
        claims.role === 'superadmin';

      if (!isAdmin) {
        // Se o usuário não tiver a claim de administrador, desconecta imediatamente
        await signOut(auth);
        throw new Error(
          'Acesso negado: Este e-mail não possui autorização administrativa (custom claim admin ausente).'
        );
      }

      return {
        user,
        claims,
        isAdmin: true,
      };
    } catch (error) {
      console.error('Erro no login administrativo:', error);
      throw error;
    }
  },

  /**
   * Realiza logout do usuário ativo
   */
  async signOut(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Retorna o usuário atualmente autenticado ou null
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  /**
   * Observador do estado de autenticação
   */
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

export default AuthService;

