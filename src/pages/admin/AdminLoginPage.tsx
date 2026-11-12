import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  X,
  HelpCircle,
} from 'lucide-react';
import { AdminActionButton } from '@/components/admin';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sendPasswordReset, isAuthenticated, isLoading: isAuthChecking } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estado do Modal de Recuperação de Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Se já autenticado, redireciona diretamente para a tela Meus Eventos
  useEffect(() => {
    if (!isAuthChecking && isAuthenticated) {
      const origin = (location.state as any)?.from?.pathname || '/admin/eventos';
      navigate(origin, { replace: true });
    }
  }, [isAuthenticated, isAuthChecking, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Por favor, informe seu e-mail institucional e senha de acesso.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Por favor, insira um endereço de e-mail institucional válido.');
      return;
    }

    setIsLoading(true);

    try {
      await login(trimmedEmail, trimmedPassword);
      setSuccessMessage('Autenticação confirmada! Redirecionando para Meus Eventos...');
      
      const destination = (location.state as any)?.from?.pathname || '/admin/eventos';
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 400);
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao autenticar. Verifique suas credenciais de acesso ou contate o superadministrador.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const trimmed = resetEmail.trim();
    if (!trimmed) {
      setResetError('Informe o e-mail cadastrado para receber o link de redefinição.');
      return;
    }

    setIsResetLoading(true);
    try {
      await sendPasswordReset(trimmed);
      setResetSuccess(
        'Instruções enviadas com sucesso! Verifique a caixa de entrada do seu e-mail para criar uma nova senha.'
      );
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess('');
        setSuccessMessage('E-mail de recuperação enviado! Siga as instruções recebidas.');
      }, 2500);
    } catch (err: any) {
      setResetError(err.message || 'Falha ao solicitar redefinição de senha.');
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-arena-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Arena Spotlights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-arena-red/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-arena-blue/15 blur-[120px]" />

        {/* Subtle decorative mascot */}
        <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none">
          <ArenaMascot variant="transparent" width={340} />
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo Completa Oficial */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <ArenaLogo
            variant="complete"
            width={290}
            className="max-w-[260px] sm:max-w-[310px] drop-shadow-2xl"
            alt="Arena Voice"
          />
        </div>

        {/* Card de Autenticação */}
        <div className="w-full bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="mb-6 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Acesso Administrativo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Login do Sistema
            </h2>
            <p className="text-xs text-gray-400">
              Controle de rodadas, projetos e auditoria de votos em tempo real
            </p>
          </div>

          {/* Feedback de Erro */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Feedback de Sucesso */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cptm.sp.gov.br"
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setIsResetModalOpen(true);
                  }}
                  className="text-[11px] text-arena-gold hover:text-white transition-colors underline-offset-2 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <AdminActionButton
                type="submit"
                variant="danger"
                isLoading={isLoading}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                className="w-full py-3.5 text-sm"
              >
                Entrar no Painel
              </AdminActionButton>
            </div>
          </form>

          {/* Rodapé informativo de segurança */}
          <div className="mt-6 pt-4 border-t border-arena-border/50 text-center">
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span>Acesso público à votação? Acesse via QR Code oficial</span>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3 text-arena-gold">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-lg font-black text-white">Recuperação de Senha</h3>
            </div>

            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              Informe seu e-mail cadastrado. Enviaremos um link de acesso seguro para você definir uma nova senha.
            </p>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  E-mail do Administrador
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@cptm.sp.gov.br"
                    disabled={isResetLoading}
                    className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-gold transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <AdminActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-1/2 py-3 text-xs"
                >
                  Cancelar
                </AdminActionButton>

                <AdminActionButton
                  type="submit"
                  variant="gold"
                  isLoading={isResetLoading}
                  className="w-1/2 py-3 text-xs"
                >
                  Enviar Link
                </AdminActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoginPage;
