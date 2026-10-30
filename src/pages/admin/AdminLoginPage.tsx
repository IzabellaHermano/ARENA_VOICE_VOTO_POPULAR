import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArenaLogo } from '@/components/branding';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Autenticação mock para a Etapa 1; integração completa com Firebase Auth na etapa correspondente
    navigate('/admin/projetos');
  };

  return (
    <div className="min-h-screen bg-arena-dark text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Regra: Login administrativo: logo completa */}
        <div className="mb-8">
          <ArenaLogo variant="complete" width={280} />
        </div>

        <div className="w-full bg-arena-card border border-arena-border rounded-2xl p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold">Painel do Administrador</h2>
            <p className="text-xs text-gray-400 mt-1">
              Acesso restrito para controle das rodadas e resultados
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@arenavoice.com"
                  className="w-full bg-arena-dark border border-arena-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-arena-dark border border-arena-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-arena-red hover:bg-arena-redHover text-white font-bold py-2.5 px-4 rounded-lg shadow-red-glow flex items-center justify-center gap-2 transition-all"
            >
              <span>Acessar Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-white underline underline-offset-4"
          >
            ← Voltar para a área pública
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;

