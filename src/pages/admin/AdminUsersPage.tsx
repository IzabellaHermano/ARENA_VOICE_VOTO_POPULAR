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
  Trophy,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { AdminActionButton } from '@/components/admin';
import { AdminProfile } from '@/types/supabase';
import { AdminUsersService, CreateAdminPayload } from '@/services/adminUsersService';
import { EventService, EventSummary } from '@/services/eventService';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const AdminUsersPage: React.FC = () => {
  const { adminUser, isSuperadmin } = useAdminAuth();

  const [adminsList, setAdminsList] = useState<AdminProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Mapeamento de atribuições de eventos (userId -> eventId[])
  const [allAssignmentsMap, setAllAssignmentsMap] = useState<Record<string, string[]>>({});

  // Estado do Modal de Criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'superadmin' | 'admin' | 'operator'>('admin');
  const [createActive, setCreateActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do Modal de Vínculo de Eventos
  const [selectedAdminForEvents, setSelectedAdminForEvents] = useState<AdminProfile | null>(null);
  const [availableEvents, setAvailableEvents] = useState<EventSummary[]>([]);
  const [adminAssignedEventIds, setAdminAssignedEventIds] = useState<Set<string>>(new Set());
  const [isLoadingEventsModal, setIsLoadingEventsModal] = useState(false);
  const [eventActionLoading, setEventActionLoading] = useState<string | null>(null);
  const [orphanWarningEvent, setOrphanWarningEvent] = useState<{ id: string; name: string } | null>(null);

  // Carrega a lista de administradores e os vínculos existentes
  const loadAdmins = async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const data = await AdminUsersService.listAdmins();
      setAdminsList(data);

      // Carrega vínculos de eventos de todos os administradores
      const assignments = await AdminUsersService.listEventAdmins();
      const map: Record<string, string[]> = {};
      assignments.forEach((asg) => {
        if (!map[asg.userId]) map[asg.userId] = [];
        map[asg.userId].push(asg.eventId);
      });
      setAllAssignmentsMap(map);
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

    // Proteção: Não permite desativar o último superadmin do sistema
    if (targetAdmin.role === 'superadmin' && targetAdmin.active) {
      const superCount = await AdminUsersService.checkSuperadminCount();
      if (superCount <= 1) {
        setFeedbackError('Ação bloqueada: Não é permitido desativar o único Superadministrador ativo do sistema.');
        return;
      }
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

    // Proteção: Não permite excluir o último superadmin do sistema
    if (targetAdmin.role === 'superadmin') {
      const superCount = await AdminUsersService.checkSuperadminCount();
      if (superCount <= 1) {
        setFeedbackError('Ação bloqueada: Não é permitido excluir o único Superadministrador do sistema.');
        return;
      }
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

  // =========================================================================
  // GESTÃO DE ATRIBUIÇÃO DE EVENTOS
  // =========================================================================

  const handleOpenEventModal = async (targetAdmin: AdminProfile) => {
    setSelectedAdminForEvents(targetAdmin);
    setIsLoadingEventsModal(true);
    setOrphanWarningEvent(null);

    try {
      // 1. Carrega todos os eventos disponíveis
      const events = await EventService.listEvents();
      setAvailableEvents(events);

      // 2. Carrega vínculos deste administrador
      const assignments = await AdminUsersService.listEventAdmins(targetAdmin.id);
      const assignedIds = new Set(assignments.map((a) => a.eventId));
      setAdminAssignedEventIds(assignedIds);
    } catch (err: any) {
      setFeedbackError('Erro ao carregar permissões de eventos: ' + err.message);
    } finally {
      setIsLoadingEventsModal(false);
    }
  };

  const handleCloseEventModal = () => {
    setSelectedAdminForEvents(null);
    setOrphanWarningEvent(null);
    setEventActionLoading(null);
  };

  const handleGrantAccess = async (eventId: string, eventName: string) => {
    if (!selectedAdminForEvents) return;

    setEventActionLoading(eventId);
    setFeedbackError(null);

    try {
      await AdminUsersService.grantEventAccess(eventId, selectedAdminForEvents.id);
      setAdminAssignedEventIds((prev) => new Set([...prev, eventId]));

      // Atualiza o mapa global de vínculos
      setAllAssignmentsMap((prev) => {
        const current = prev[selectedAdminForEvents.id] || [];
        return {
          ...prev,
          [selectedAdminForEvents.id]: [...new Set([...current, eventId])],
        };
      });

      setFeedbackSuccess(`Acesso ao evento "${eventName}" concedido para ${selectedAdminForEvents.name}.`);
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao conceder acesso ao evento.');
    } finally {
      setEventActionLoading(null);
    }
  };

  const handleRequestRevokeAccess = async (eventId: string, eventName: string) => {
    if (!selectedAdminForEvents) return;

    setEventActionLoading(eventId);

    try {
      // Checa se este é o único administrador deste evento
      const count = await AdminUsersService.checkEventAdminCount(eventId);
      if (count <= 1) {
        // Alerta de evento órfão!
        setOrphanWarningEvent({ id: eventId, name: eventName });
        setEventActionLoading(null);
        return;
      }

      // Executa revogação direta se houver outros administradores
      await executeRevokeAccess(eventId, eventName);
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao verificar administradores do evento.');
      setEventActionLoading(null);
    }
  };

  const executeRevokeAccess = async (eventId: string, eventName: string) => {
    if (!selectedAdminForEvents) return;

    setEventActionLoading(eventId);
    setOrphanWarningEvent(null);

    try {
      await AdminUsersService.revokeEventAccess(eventId, selectedAdminForEvents.id);
      setAdminAssignedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });

      // Atualiza o mapa global de vínculos
      setAllAssignmentsMap((prev) => {
        const current = prev[selectedAdminForEvents.id] || [];
        return {
          ...prev,
          [selectedAdminForEvents.id]: current.filter((id) => id !== eventId),
        };
      });

      setFeedbackSuccess(`Acesso ao evento "${eventName}" revogado com sucesso.`);
    } catch (err: any) {
      setFeedbackError(err.message || 'Falha ao revogar acesso ao evento.');
    } finally {
      setEventActionLoading(null);
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
                <th className="py-3.5 px-4 sm:px-6 hidden sm:table-cell">Eventos Autorizados</th>
                <th className="py-3.5 px-4 sm:px-6">Situação</th>
                <th className="py-3.5 px-4 sm:px-6 hidden lg:table-cell">Data de Cadastro</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/50 text-gray-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-arena-red mb-2" />
                    <span>Carregando administradores...</span>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
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

                      {/* Eventos Autorizados */}
                      <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
                        {adm.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-arena-gold/15 text-arena-gold border border-arena-gold/30">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Global (Todos)</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEventModal(adm)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-arena-border hover:border-arena-gold/50 transition-colors"
                            title="Clique para gerenciar eventos vinculados"
                          >
                            <Trophy className="w-3.5 h-3.5 text-arena-gold" />
                            <span>
                              {allAssignmentsMap[adm.id]?.length || 0}{' '}
                              {allAssignmentsMap[adm.id]?.length === 1 ? 'evento' : 'eventos'}
                            </span>
                          </button>
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
                      <td className="py-4 px-4 sm:px-6 hidden lg:table-cell text-xs text-gray-400">
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
                            {/* Gerenciar Eventos Autorizados */}
                            <button
                              type="button"
                              onClick={() => handleOpenEventModal(adm)}
                              title="Gerenciar eventos autorizados"
                              className="p-2 rounded-xl border border-arena-border text-arena-gold hover:border-arena-gold/50 hover:bg-arena-gold/10 transition-colors"
                            >
                              <Trophy className="w-4 h-4" />
                            </button>

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

      {/* 7. Modal de Gerenciamento de Vínculo de Eventos */}
      {selectedAdminForEvents && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-arena-card border border-arena-border rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={handleCloseEventModal}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1 text-arena-gold">
              <Trophy className="w-5 h-5" />
              <h3 className="text-lg font-black text-white">Eventos Autorizados</h3>
            </div>

            <div className="text-xs text-gray-400 mb-5 flex items-center gap-2">
              <span>Administrador:</span>
              <span className="font-bold text-white">{selectedAdminForEvents.name}</span>
              <span className="text-gray-500 font-mono">({selectedAdminForEvents.email})</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-arena-blue/20 text-arena-blue border border-arena-blue/40">
                {selectedAdminForEvents.role}
              </span>
            </div>

            {/* Aviso de Superadmin com acesso irrestrito */}
            {selectedAdminForEvents.role === 'superadmin' ? (
              <div className="p-4 rounded-2xl bg-arena-gold/10 border border-arena-gold/30 text-arena-gold text-xs space-y-1 mb-4">
                <div className="font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acesso Global Automático</span>
                </div>
                <p className="text-gray-300">
                  Superadministradores possuem autorização irrestrita no sistema para gerenciar, criar e auditar todos os eventos cadastrados.
                </p>
              </div>
            ) : null}

            {/* Aviso de Alerta de Evento Órfão */}
            {orphanWarningEvent && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2 mb-4 animate-fade-in">
                <div className="font-bold flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Atenção: Evento Ficará Sem Administrador</span>
                </div>
                <p>
                  O evento <strong>"{orphanWarningEvent.name}"</strong> não possui nenhum outro administrador vinculado. Se revogar este acesso, nenhum operador ou administrador poderá gerenciar o evento até que um novo vínculo seja concedido.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => executeRevokeAccess(orphanWarningEvent.id, orphanWarningEvent.name)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
                  >
                    Confirmar Revogação Mesmo Assim
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrphanWarningEvent(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Eventos com Status de Vínculo */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingEventsModal ? (
                <div className="py-12 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-arena-gold mb-2" />
                  <span>Carregando eventos do sistema...</span>
                </div>
              ) : availableEvents.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  Nenhum evento cadastrado no sistema.
                </div>
              ) : (
                availableEvents.map((ev) => {
                  const eventId = ev.id || '';
                  const isAssigned = adminAssignedEventIds.has(eventId);
                  const isActionLoading = eventActionLoading === eventId;
                  const isSuper = selectedAdminForEvents.role === 'superadmin';

                  return (
                    <div
                      key={eventId}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isAssigned
                          ? 'bg-arena-green/5 border-arena-green/30'
                          : 'bg-arena-black/40 border-arena-border'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{ev.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ev.status === 'active'
                              ? 'bg-arena-red/20 text-arena-red border border-arena-red/40'
                              : 'bg-gray-800 text-gray-400'
                          }`}>
                            {ev.status === 'active' ? 'Ao Vivo' : ev.status === 'finished' ? 'Finalizado' : 'Em Preparação'}
                          </span>
                        </div>
                        {ev.subtitle && (
                          <p className="text-xs text-gray-400">{ev.subtitle}</p>
                        )}
                        <div className="text-[11px] text-gray-500 font-mono">
                          ID: {eventId}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-bold">
                            <Check className="w-3.5 h-3.5" />
                            Acesso Ativo (Super)
                          </span>
                        ) : isAssigned ? (
                          <button
                            type="button"
                            onClick={() => handleRequestRevokeAccess(eventId, ev.name)}
                            disabled={isActionLoading}
                            className="px-3.5 py-2 rounded-xl bg-arena-red/15 hover:bg-arena-red/25 text-arena-red border border-arena-red/40 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>Revogar Acesso</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGrantAccess(eventId, ev.name)}
                            disabled={isActionLoading}
                            className="px-3.5 py-2 rounded-xl bg-arena-green/15 hover:bg-arena-green/25 text-arena-green border border-arena-green/40 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Conceder Acesso</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-arena-border/60 mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleCloseEventModal}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
