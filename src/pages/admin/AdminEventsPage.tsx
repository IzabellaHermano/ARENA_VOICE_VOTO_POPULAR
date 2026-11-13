import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminEvent } from '@/contexts/AdminEventContext';
import { EventService, EventSummary } from '@/services/eventService';
import { ArenaLogo } from '@/components/branding';
import {
  Calendar,
  Trophy,
  Plus,
  ArrowRight,
  Edit3,
  Clock,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  Radio,
  Lock,
  Archive,
  Save,
} from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminUser, role, isSuperadmin, isAdmin } = useAdminAuth();
  const { selectEvent, authorizationError, clearAuthorizationError } = useAdminEvent();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados dos modais de criação e edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Campos do formulário
  const [formName, setFormName] = useState<string>('');
  const [formSubtitle, setFormSubtitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formEventDate, setFormEventDate] = useState<string>('');
  const [formBannerUrl, setFormBannerUrl] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'draft' | 'active' | 'finished' | 'archived'>('draft');

  // Monitora a lista de eventos em tempo real exclusivamente do Supabase (filtrada pelo usuário)
  useEffect(() => {
    setIsLoading(true);
    const unsub = EventService.subscribeToEventsList(
      (eventsList) => {
        setEvents(eventsList);
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        console.error('Erro ao subscrever lista de eventos:', err);
        setErrorMessage(`Falha na sincronização de eventos: ${err.message}`);
      },
      adminUser?.uid ? { userId: adminUser.uid, role: role || undefined } : undefined
    );

    return () => unsub();
  }, [adminUser?.uid, role]);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormName('');
    setFormSubtitle('');
    setFormDescription('');
    setFormEventDate('');
    setFormBannerUrl('');
    setFormStatus('draft');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ev: EventSummary) => {
    setEditingEvent(ev);
    setFormName(ev.name);
    setFormSubtitle(ev.subtitle || '');
    setFormDescription(ev.description || '');
    setFormEventDate(ev.eventDate || '');
    setFormBannerUrl(ev.bannerUrl || '');
    setFormStatus(ev.status);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('O nome oficial do evento é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingEvent?.id) {
        // Atualiza evento existente no Supabase
        await EventService.updateEvent(editingEvent.id, {
          name: formName.trim(),
          subtitle: formSubtitle.trim(),
          description: formDescription.trim(),
          eventDate: formEventDate || undefined,
          bannerUrl: formBannerUrl.trim(),
          status: formStatus,
        });
        setSuccessMessage(`Evento "${formName}" atualizado com sucesso!`);
      } else {
        // Cria novo evento no Supabase
        await EventService.createEvent({
          name: formName.trim(),
          subtitle: formSubtitle.trim(),
          description: formDescription.trim(),
          eventDate: formEventDate || undefined,
          bannerUrl: formBannerUrl.trim(),
          status: formStatus,
        });
        setSuccessMessage(`Novo evento "${formName}" criado com sucesso!`);
      }

      closeModal();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar evento:', err);
      setErrorMessage(err.message || 'Falha ao salvar evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação de entrada: valida permissão e estabelece o evento no contexto
  const handleEnterEvent = async (eventId: string) => {
    const success = await selectEvent(eventId);
    if (success) {
      navigate('/admin/projetos');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-arena-red/20 text-arena-red border border-arena-red/40 shadow-neon-glow animate-pulse">
            <Radio className="w-3 h-3" />
            <span>Em andamento</span>
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-500/20 text-gray-300 border border-gray-500/30">
            <Lock className="w-3 h-3" />
            <span>Finalizado</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700">
            <Archive className="w-3 h-3" />
            <span>Arquivado</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-arena-gold/15 text-arena-gold border border-arena-gold/30">
            <Clock className="w-3 h-3" />
            <span>Em preparação</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header da Área: MEUS EVENTOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Plataforma Multieventos Arena Voice</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
            MEUS <span className="text-arena-red">EVENTOS</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Selecione uma competição para administrar projetos, controlar rodadas de votação e gerar dashboards.
          </p>
        </div>

        {/* Botão + CRIAR NOVO EVENTO (Permitido para superadmin) */}
        {isSuperadmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-arena-red to-[#B3050F] hover:from-[#FF1E27] hover:to-arena-red text-white text-xs font-black uppercase tracking-wider shadow-neon-glow transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>CRIAR NOVO EVENTO</span>
          </button>
        )}
      </div>

      {/* Banner de Erro de Autorização / Acesso Revogado */}
      {authorizationError && (
        <div className="p-4 rounded-2xl bg-arena-red/20 border border-arena-red/60 text-arena-red text-xs sm:text-sm flex items-center justify-between shadow-neon-glow animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-bold">{authorizationError}</span>
          </div>
          <button
            onClick={clearAuthorizationError}
            className="p-1 text-arena-red hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mensagens de Sucesso e Erro */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center gap-2 animate-fade-in shadow-green-glow">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Lista de Eventos (Grid de Cards) */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-arena-red border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-gray-400 font-mono">Carregando eventos autorizados via Supabase...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-arena-card border border-arena-border rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-arena-gold mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Nenhum evento disponível</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {isSuperadmin
                ? 'Nenhum evento cadastrado no sistema. Clique em "CRIAR NOVO EVENTO" para iniciar.'
                : 'Você ainda não possui eventos vinculados ao seu perfil administrativo. Solicite autorização ao Superadministrador.'}
            </p>
          </div>
          {isSuperadmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-arena-red text-white text-xs font-bold"
            >
              Criar Primeiro Evento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-arena-card border border-arena-border hover:border-white/20 rounded-3xl p-5 flex flex-col justify-between shadow-xl transition-all group relative overflow-hidden"
            >
              {/* Efeito Glow discreto no topo */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-arena-red via-arena-gold to-arena-blue opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="space-y-4">
                {/* Header do Card: Status e Botão Editar */}
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(ev.status)}

                  <div className="flex items-center gap-1.5">
                    {(isSuperadmin || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => openEditModal(ev)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Editar Informações do Evento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Capa / Banner do Evento (se cadastrado) ou Logo Padrão */}
                <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#0c182d] via-[#101c30] to-[#070e1a] border border-arena-border/80 overflow-hidden flex items-center justify-center shadow-inner">
                  {ev.bannerUrl ? (
                    <img
                      src={ev.bannerUrl}
                      alt={ev.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                      <ArenaLogo variant="textWithSlogan" width={180} />
                      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-1">
                        CPTM • Arena Voice
                      </span>
                    </div>
                  )}
                </div>

                {/* Título e Subtítulo */}
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white group-hover:text-arena-gold transition-colors line-clamp-1">
                    {ev.name}
                  </h3>
                  {ev.subtitle && (
                    <p className="text-xs font-bold text-arena-blueLight line-clamp-1">
                      {ev.subtitle}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Metadados: Data e Contagem de Projetos */}
                <div className="pt-2 border-t border-arena-border/40 flex items-center justify-between text-xs text-gray-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-arena-gold" />
                    <span className="font-bold text-gray-200">
                      {ev.projectsCount} {ev.projectsCount === 1 ? 'projeto' : 'projetos'}
                    </span>
                  </div>

                  {ev.eventDate && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{ev.eventDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ação Principal: ENTRAR NO EVENTO */}
              <div className="pt-5 mt-4 border-t border-arena-border/60">
                <button
                  type="button"
                  onClick={() => handleEnterEvent(ev.id || '')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-arena-red to-[#B3050F] hover:from-[#FF1E27] hover:to-arena-red text-white text-xs font-black uppercase tracking-wider shadow-neon-glow transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                >
                  <span>ENTRAR NO EVENTO</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-arena-card border border-arena-border rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-arena-border/60 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-arena-gold" />
                <h3 className="text-lg font-black text-white">
                  {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Nome Oficial do Evento *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Arena Voice 2027"
                  className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Subtítulo / Slogan
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="Ex: Mostra de Inovação Ferroviária CPTM"
                  className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva o propósito da competição, público-alvo ou detalhes da edição..."
                  className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Data de Realização
                  </label>
                  <input
                    type="date"
                    value={formEventDate}
                    onChange={(e) => setFormEventDate(e.target.value)}
                    className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-blue transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Status do Evento
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-blue transition-colors"
                  >
                    <option value="draft">Em preparação</option>
                    <option value="active">Em andamento</option>
                    <option value="finished">Finalizado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  URL da Imagem de Capa / Banner (Opcional)
                </label>
                <input
                  type="url"
                  value={formBannerUrl}
                  onChange={(e) => setFormBannerUrl(e.target.value)}
                  placeholder="https://... ou vazio para logo padrão"
                  className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-arena-border/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-arena-red to-[#B3050F] hover:from-[#FF1E27] hover:to-arena-red text-white text-xs font-black uppercase tracking-wider shadow-neon-glow transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : editingEvent ? 'Salvar Alterações' : 'Criar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventsPage;
