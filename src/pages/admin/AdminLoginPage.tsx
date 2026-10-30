import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo, ArenaMascot } from '@/components/branding';
import { Mail, Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { AdminActionButton } from '@/components/admin';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e senha institucional.');
      return;
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Por favor, insira um endereço de e-mail válido.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulação assíncrona preparada para Firebase Auth signInWithEmailAndPassword
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Salva sessão local para navegação do painel
      sessionStorage.setItem(
        'arena_voice_admin_token',
        JSON.stringify({
          email: email.trim(),
          loginTime: new Date().toISOString(),
          role: 'admin',
        })
      );

      navigate('/admin/projetos');
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('Falha ao autenticar. Verifique suas credenciais de acesso.');
    } finally {
      setIsLoading(false);
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
        <div className="mb-8 flex justify-center">
          <ArenaLogo
            variant="complete"
            width={290}
            className="max-w-[270px] sm:max-w-[310px] drop-shadow-2xl"
            alt="Arena Voice"
          />
        </div>

        {/* Card de Autenticação */}
        <div className="w-full bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="mb-6 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Acesso Restrito</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Painel do Administrador
            </h2>
            <p className="text-xs text-gray-400">
              Controle de rodadas, projetos e auditoria de votos em tempo real
            </p>
          </div>

          {/* Feedback de Erro */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
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
                  placeholder="admin@arenavoice.com"
                  disabled={isLoading}
                  className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                />
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
                ENTRAR
              </AdminActionButton>
            </div>
          </form>
        </div>

        {/* Link para área pública */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Voltar para a área de votação pública
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
