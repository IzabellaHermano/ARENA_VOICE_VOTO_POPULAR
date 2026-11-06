import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Search,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Mail,
  User,
  Shield,
  Trash2,
  Power,
} from 'lucide-react';
import { AdminActionButton } from '@/components/admin';
import { AdminProfile } from '@/types/supabase';
import { AdminUsersService, CreateAdminPayload } from '@/services/adminUsersService';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const AdminUsersPage: React.FC = () => {
  const { adminUser, isSuperadmin } = useAdminAuth();

  const [adminsList, setAdminsList] = useState<AdminProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Estado do Modal de Criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'superadmin' | 'admin' | 'operator'>('admin');
  const [createActive, setCreateActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega a lista de administradores
  const loadAdmins = async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const data = await AdminUsersService.listAdmins();
      setAdminsList(data);
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao carregar lista de administradores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    const name = createName.trim();
    const email = createEmail.trim();

    if (!name || !email) {
      setFeedbackError('Nome completo e e-mail institucional são obrigatórios.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFeedbackError('Por favor, insira um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateAdminPayload = {
        name,
        email,
        password: createPassword.trim() || 'ArenaVoice@2025',
        role: createRole,
        active: createActive,
      };

      await AdminUsersService.createAdmin(payload);
      setFeedbackSuccess(`Administrador "${name}" cadastrado com sucesso!`);
      setIsCreateModalOpen(false);

      // Limpa formulário
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('admin');
      setCreateActive(true);

      await loadAdmins();
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao cadastrar administrador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (targetAdmin: AdminProfile) => {
    if (targetAdmin.id === adminUser?.uid) {
      setFeedbackError('Você não pode desativar a sua própria conta logada.');
      return;
    }

    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const updatedStatus = await AdminUsersService.toggleActive(targetAdmin.id, targetAdmin.active);
      setFeedbackSuccess(
        `Conta de "${targetAdmin.name}" foi ${updatedStatus ? 'ativada' : 'desativada'} com sucesso.`
      );
      setAdminsList((prev) =>
        prev.map((adm) => (adm.id === targetAdmin.id ? { ...adm, active: updatedStatus } : adm))
      );
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao alternar status do usuário.');
    }
  };

  const handleDeleteAdmin = async (targetAdmin: AdminProfile) => {
    if (targetAdmin.id === adminUser?.uid) {
      setFeedbackError('Você não pode excluir a sua própria conta de superadministrador.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja remover o administrador "${targetAdmin.name}"?`)) {
      return;
    }

    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      await AdminUsersService.deleteAdmin(targetAdmin.id);
      setFeedbackSuccess(`Administrador "${targetAdmin.name}" removido com sucesso.`);
      setAdminsList((prev) => prev.filter((adm) => adm.id !== targetAdmin.id));
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao excluir administrador.');
    }
  };

  // Filtragem
  const filteredAdmins = adminsList.filter((adm) => {
    const matchesSearch =
      adm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || adm.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalUsers = adminsList.length;
  const superadminsCount = adminsList.filter((u) => u.role === 'superadmin').length;
  const adminsCount = adminsList.filter((u) => u.role === 'admin').length;
  const operatorsCount = adminsList.filter((u) => u.role === 'operator').length;

  return (
    <div className="space-y-6">
      {/* 1. Header com Título e Ação Primária */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Gerenciamento de Administradores
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-arena-gold/15 text-arena-gold border border-arena-gold/40">
              Superadmin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Controle de permissões, papéis de acesso e credenciais da equipe do evento
          </p>
        </div>

        {isSuperadmin && (
          <AdminActionButton
            variant="danger"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
            className="py-3 px-5 text-xs font-bold shrink-0"
          >
            Novo Administrador
          </AdminActionButton>
        )}
      </div>

      {/* 2. Feedback de Notificação */}
      {feedbackError && (
        <div className="p-4 rounded-2xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button
            onClick={() => setFeedbackError(null)}
            className="p-1 text-arena-red hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {feedbackSuccess && (
        <div className="p-4 rounded-2xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            onClick={() => setFeedbackSuccess(null)}
            className="p-1 text-arena-green hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-400">Total Usuários</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{totalUsers}</div>
          <div className="text-[11px] text-gray-400 mt-1">Perfis cadastrados</div>
        </div>

        <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-arena-gold">Superadmins</span>
            <ShieldCheck className="w-4 h-4 text-arena-gold" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{superadminsCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">Acesso irrestrito</div>
        </div>

        <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-arena-blue">Administradores</span>
            <Shield className="w-4 h-4 text-arena-blue" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{adminsCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">Projetos & Rodadas</div>
        </div>

        <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-300">Operadores</span>
            <UserCheck className="w-4 h-4 text-gray-300" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{operatorsCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">Acompanhamento ao vivo</div>
        </div>
      </div>

      {/* 4. Barra de Filtro e Busca */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-arena-black border border-arena-border rounded-xl px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-arena-red"
          >
            <option value="all">Todos os Papéis</option>
            <option value="superadmin">Superadministrador</option>
            <option value="admin">Administrador</option>
            <option value="operator">Operador</option>
          </select>

          <button
            onClick={loadAdmins}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-arena-black border border-arena-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5. Tabela / Grid de Administradores */}
      <div className="bg-arena-card border border-arena-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-arena-black/60 text-gray-400 uppercase text-[10px] tracking-wider border-b border-arena-border">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                <th className="py-3.5 px-4 sm:px-6">Papel de Acesso</th>
                <th className="py-3.5 px-4 sm:px-6">Situação</th>
                <th className="py-3.5 px-4 sm:px-6 hidden md:table-cell">Data de Cadastro</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/50 text-gray-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-arena-red mb-2" />
                    <span>Carregando administradores...</span>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Nenhum administrador encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((adm) => {
                  const isCurrentLoggedUser = adm.id === adminUser?.uid;

                  return (
                    <tr
                      key={adm.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Nome e E-mail */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-arena-black border border-arena-border flex items-center justify-center text-gray-300 font-bold shrink-0">
                            {adm.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{adm.name}</span>
                              {isCurrentLoggedUser && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-arena-red/20 text-arena-red border border-arena-red/30 font-semibold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-500" />
                              <span>{adm.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Badge do Papel */}
                      <td className="py-4 px-4 sm:px-6">
                        {adm.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-arena-gold/15 text-arena-gold border border-arena-gold/30">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Superadministrador
                          </span>
                        ) : adm.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-arena-blue/15 text-arena-blue border border-arena-blue/30">
                            <Shield className="w-3.5 h-3.5" />
                            Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/15 text-gray-300 border border-gray-500/30">
                            <UserCheck className="w-3.5 h-3.5" />
                            Operador
                          </span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="py-4 px-4 sm:px-6">
                        {adm.active ? (
                          <span className="inline-flex items-center gap-1.5 text-arena-green text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-arena-green animate-pulse" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-arena-red text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-arena-red" />
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* Data de Criação */}
                      <td className="py-4 px-4 sm:px-6 hidden md:table-cell text-xs text-gray-400">
                        {adm.created_at
                          ? new Date(adm.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        {isSuperadmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Alternar Ativo/Inativo */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(adm)}
                              disabled={isCurrentLoggedUser}
                              title={
                                isCurrentLoggedUser
                                  ? 'Você não pode desativar sua própria conta'
                                  : adm.active
                                  ? 'Desativar acesso'
                                  : 'Ativar acesso'
                              }
                              className={`p-2 rounded-xl border transition-colors ${
                                isCurrentLoggedUser
                                  ? 'opacity-30 cursor-not-allowed border-arena-border text-gray-600'
                                  : adm.active
                                  ? 'border-arena-border text-gray-400 hover:text-arena-red hover:border-arena-red/50'
                                  : 'border-arena-green/30 text-arena-green hover:bg-arena-green/10'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            {/* Excluir Administrador */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(adm)}
                              disabled={isCurrentLoggedUser}
                              title={
                                isCurrentLoggedUser
                                  ? 'Você não pode excluir sua própria conta'
                                  : 'Excluir administrador'
                              }
                              className={`p-2 rounded-xl border transition-colors ${
                                isCurrentLoggedUser
                                  ? 'opacity-30 cursor-not-allowed border-arena-border text-gray-600'
                                  : 'border-arena-border text-gray-400 hover:text-arena-red hover:border-arena-red/50 hover:bg-arena-red/10'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal de Cadastro de Novo Administrador */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2 text-arena-red">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-lg font-black text-white">Cadastrar Administrador</h3>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Defina as credenciais e o nível de acesso institucional para a equipe
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silveira"
                    required
                    className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                  />
                </div>
              </div>

              {/* E-mail Institucional */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  E-mail Institucional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="operador@cptm.sp.gov.br"
                    required
                    className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors"
                  />
                </div>
              </div>

              {/* Senha Inicial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Senha Inicial de Acesso
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="ArenaVoice@2025"
                    className="w-full bg-arena-black border border-arena-border rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-red transition-colors font-mono"
                  />
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Se omitida, será atribuída a senha padrão provisória &ldquo;ArenaVoice@2025&rdquo;.
                </span>
              </div>

              {/* Nível de Acesso (Papel) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Nível de Acesso
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateRole('superadmin')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      createRole === 'superadmin'
                        ? 'bg-arena-gold/15 border-arena-gold text-white shadow-yellow-glow'
                        : 'bg-arena-black border-arena-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-xs font-black uppercase text-arena-gold">Superadmin</span>
                    <span className="text-[10px] text-gray-400 mt-1 leading-tight">
                      Acesso total, usuários e configs
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateRole('admin')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      createRole === 'admin'
                        ? 'bg-arena-blue/15 border-arena-blue text-white shadow-blue-glow'
                        : 'bg-arena-black border-arena-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-xs font-black uppercase text-arena-blue">Administrador</span>
                    <span className="text-[10px] text-gray-400 mt-1 leading-tight">
                      Controle de projetos e rodadas
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateRole('operator')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      createRole === 'operator'
                        ? 'bg-gray-400/20 border-gray-300 text-white'
                        : 'bg-arena-black border-arena-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-xs font-black uppercase text-gray-300">Operador</span>
                    <span className="text-[10px] text-gray-400 mt-1 leading-tight">
                      Acompanhamento e relatórios
                    </span>
                  </button>
                </div>
              </div>

              {/* Situação da Conta */}
              <div className="pt-1 flex items-center justify-between p-3 rounded-xl bg-arena-black border border-arena-border">
                <div>
                  <span className="text-xs font-bold text-white block">Situação da Conta</span>
                  <span className="text-[10px] text-gray-400">
                    {createActive ? 'Conta ativa e liberada para login imediato' : 'Conta suspensa'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateActive((prev) => !prev)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    createActive ? 'bg-arena-green' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white block transition-transform ${
                      createActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center gap-3 pt-4">
                <AdminActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-1/2 py-3 text-xs"
                >
                  Cancelar
                </AdminActionButton>

                <AdminActionButton
                  type="submit"
                  variant="danger"
                  isLoading={isSubmitting}
                  className="w-1/2 py-3 text-xs"
                >
                  Cadastrar Administrador
                </AdminActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
