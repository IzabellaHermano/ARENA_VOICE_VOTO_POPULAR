import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';
import { EventService, DEFAULT_EVENT_ID, ProjectHistoryCheck } from '@/services/eventService';
import { ProjectCard, ProjectForm, AdminActionButton } from '@/components/admin';
import {
  Play,
  Plus,
  Sparkles,
  AlertCircle,
  QrCode,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';

export const AdminProjectsPage: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Estado do Modal de Exclusão / Histórico
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    project: Project | null;
    history: ProjectHistoryCheck | null;
    isChecking: boolean;
    isDeleting: boolean;
  }>({
    isOpen: false,
    project: null,
    history: null,
    isChecking: false,
    isDeleting: false,
  });

  // Auto-limpa mensagem de sucesso após 5 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Carrega e escuta projetos em tempo real exclusivamente via Supabase
  useEffect(() => {
    setIsLoadingList(true);
    const unsub = EventService.subscribeToProjectsList(
      DEFAULT_EVENT_ID,
      (supabaseProjects) => {
        setIsLoadingList(false);
        if (supabaseProjects && supabaseProjects.length > 0) {
          const mapped: Project[] = supabaseProjects.map((sp) => ({
            id: sp.id || '',
            nome: sp.name,
            descricao: sp.description,
            bannerUrl: sp.bannerUrl,
            ordem: sp.order,
            ativo: sp.active,
            categoria: sp.category || '',
          }));
          setProjects(mapped);

          setSelectedProjectId((prev) => {
            if (prev && mapped.some((p) => p.id === prev)) {
              return prev;
            }
            // Seleciona o primeiro ativo ou o primeiro disponível
            const firstActive = mapped.find((p) => p.ativo);
            return firstActive ? firstActive.id : mapped[0].id;
          });
        } else {
          // Banco vazio: sem fallbacks fictícios
          setProjects([]);
          setSelectedProjectId('');
        }
      },
      (err) => {
        setIsLoadingList(false);
        console.error('Erro na subscrição em tempo real de projetos:', err);
        setErrorMessage(`Falha na sincronização de projetos: ${err.message}`);
      }
    );

    return () => unsub();
  }, []);

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
  };

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  // 1. ALTERNAR ATIVAÇÃO NO SUPABASE
  const handleToggleActive = async (project: Project) => {
    setErrorMessage(null);
    try {
      const nextActive = !project.ativo;
      await EventService.toggleProjectActive(project.id, nextActive);
      setSuccessMessage(
        `Projeto "${project.nome}" ${nextActive ? 'ativado' : 'desativado'} com sucesso.`
      );
    } catch (err: unknown) {
      console.error('Erro ao alternar status do projeto no Supabase:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status do projeto.';
      setErrorMessage(msg);
    }
  };

  // 2. SALVAR OU CRIAR PROJETO NO SUPABASE
  const handleSaveProject = async (data: Partial<Project>) => {
    setErrorMessage(null);
    try {
      if (editingProject) {
        // Edição preservando a chave primária (id)
        await EventService.updateProject(editingProject.id, {
          name: data.nome,
          category: data.categoria,
          description: data.descricao,
          bannerUrl: data.bannerUrl,
          order: data.ordem,
          active: data.ativo,
        });
        setSuccessMessage(`Projeto "${data.nome}" atualizado com sucesso no Supabase.`);
      } else {
        // Criação de novo projeto oficial no Supabase
        await EventService.createProject({
          eventId: DEFAULT_EVENT_ID,
          name: data.nome || '',
          category: data.categoria,
          description: data.descricao,
          bannerUrl: data.bannerUrl,
          order: data.ordem,
          active: data.ativo ?? true,
        });
        setSuccessMessage(`Projeto "${data.nome}" cadastrado com sucesso no Supabase.`);
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar projeto no Supabase:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados no Supabase.';
      setErrorMessage(msg);
      throw err; // Repassa para o ProjectForm exibir no formulário
    }
  };

  // 3. FLUXO DE EXCLUSÃO SEGURA / PROTEÇÃO DE HISTÓRICO
  const handleRequestDelete = async (project: Project) => {
    setErrorMessage(null);
    setDeleteModalState({
      isOpen: true,
      project,
      history: null,
      isChecking: true,
      isDeleting: false,
    });

    try {
      const history = await EventService.checkProjectHistory(project.id);
      setDeleteModalState((prev) => ({
        ...prev,
        history,
        isChecking: false,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao checar histórico.';
      setErrorMessage(msg);
      setDeleteModalState((prev) => ({
        ...prev,
        isOpen: false,
        isChecking: false,
      }));
    }
  };

  const handleConfirmDelete = async () => {
    const { project, history } = deleteModalState;
    if (!project) return;

    if (history?.hasHistory) {
      setErrorMessage('Ação bloqueada: projetos com histórico não podem ser excluídos fisicamente.');
      return;
    }

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));
    try {
      await EventService.deleteProject(project.id, false);
      setSuccessMessage(`Projeto "${project.nome}" excluído com sucesso do banco.`);
      setDeleteModalState({
        isOpen: false,
        project: null,
        history: null,
        isChecking: false,
        isDeleting: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir projeto.';
      setErrorMessage(msg);
      setDeleteModalState((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleConfirmDeactivateFromModal = async () => {
    const { project } = deleteModalState;
    if (!project) return;

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));
    try {
      await EventService.toggleProjectActive(project.id, false);
      setSuccessMessage(`Projeto "${project.nome}" desativado para preservar o histórico de votação.`);
      setDeleteModalState({
        isOpen: false,
        project: null,
        history: null,
        isChecking: false,
        isDeleting: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao desativar projeto.';
      setErrorMessage(msg);
      setDeleteModalState((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // 4. FLUXO ADMINISTRATIVO: LIBERAR VOTAÇÃO NO SERVIDOR
  const handleLiberarVotacao = async () => {
    if (!selectedProjectId) {
      setErrorMessage('Selecione um projeto para avaliação antes de liberar a rodada.');
      return;
    }

    setIsOpening(true);
    setErrorMessage(null);

    try {
      await EventService.openRound(DEFAULT_EVENT_ID, selectedProjectId);
      navigate('/admin/votacao');
    } catch (err: unknown) {
      console.error('Erro ao abrir rodada no Supabase:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao liberar rodada no servidor.';
      setErrorMessage(msg);
    } finally {
      setIsOpening(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-blue/15 text-arena-blue border border-arena-blue/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestão dos Participantes — Supabase</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Projetos da Competição
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Cadastre, edite e gerencie os projetos reais persistidos no banco Supabase. Selecione o projeto ativo para liberar a rodada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/qrcode"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4 text-arena-gold" />
            <span>QR Code</span>
          </a>

          <AdminActionButton
            onClick={handleOpenCreateModal}
            variant="secondary"
            icon={<Plus className="w-4 h-4 text-arena-gold" />}
          >
            Cadastrar Projeto
          </AdminActionButton>
        </div>
      </div>

      {/* Alertas de Notificação */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-arena-green/15 border border-arena-green/40 text-arena-green text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-arena-green" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid de Cards dos Projetos ou Estado Vazio */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={selectedProjectId === project.id}
              onSelect={handleSelectProject}
              onEdit={handleOpenEditModal}
              onToggleActive={handleToggleActive}
              onDelete={handleRequestDelete}
            />
          ))}
        </div>
      ) : isLoadingList ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-arena-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-300">Carregando projetos do Supabase...</p>
        </div>
      ) : (
        <div className="bg-arena-card border border-arena-border/70 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-arena-border flex items-center justify-center text-gray-400">
            <Layers className="w-8 h-8 text-arena-gold/80" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-black text-white">Nenhum projeto cadastrado</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              O banco de dados não possui nenhum projeto cadastrado para este evento. Cadastre o primeiro projeto oficial para iniciar a avaliação popular.
            </p>
          </div>
          <AdminActionButton
            onClick={handleOpenCreateModal}
            variant="gold"
            icon={<Plus className="w-4 h-4" />}
          >
            Cadastrar Primeiro Projeto
          </AdminActionButton>
        </div>
      )}

      {/* Barra de Ação Inferior — Botão Amarelo LIBERAR VOTAÇÃO */}
      {projects.length > 0 && (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="text-center sm:text-left">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Projeto selecionado para avaliação:
            </div>
            <div className="text-lg font-black text-white mt-0.5 flex items-center gap-2 justify-center sm:justify-start">
              <span className="w-2.5 h-2.5 rounded-full bg-arena-red animate-ping" />
              <span>{selectedProject?.nome || 'Nenhum selecionado'}</span>
              {selectedProject?.categoria && (
                <span className="text-xs text-arena-gold font-bold">
                  • {selectedProject.categoria}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Ao clicar, o servidor abrirá a rodada oficial no Supabase e os celulares do público entrarão em modo de votação em tempo real.
            </div>
          </div>

          <AdminActionButton
            onClick={handleLiberarVotacao}
            variant="gold"
            isLoading={isOpening}
            disabled={!selectedProjectId}
            icon={<Play className="w-5 h-5 fill-current" />}
            className="w-full sm:w-auto py-3.5 px-8 text-sm"
          >
            {isOpening ? 'ABRINDO RODADA NO SERVIDOR...' : 'LIBERAR VOTAÇÃO'}
          </AdminActionButton>
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <ProjectForm
        isOpen={isModalOpen}
        projectToEdit={editingProject}
        totalProjects={projects.length}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
      />

      {/* Modal de Exclusão Segura e Proteção de Histórico */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-arena-card border border-arena-border rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  deleteModalState.history?.hasHistory
                    ? 'bg-arena-gold/15 border border-arena-gold/30 text-arena-gold'
                    : 'bg-arena-red/15 border border-arena-red/30 text-arena-red'
                }`}
              >
                {deleteModalState.history?.hasHistory ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-black text-white">
                  {deleteModalState.isChecking
                    ? 'Checando integridade...'
                    : deleteModalState.history?.hasHistory
                    ? 'Exclusão Bloqueada'
                    : 'Confirmar Exclusão'}
                </h3>

                {deleteModalState.isChecking ? (
                  <p className="text-xs text-gray-400">
                    Consultando histórico de votos e rodadas no Supabase...
                  </p>
                ) : deleteModalState.history?.hasHistory ? (
                  <div className="space-y-2 text-xs text-gray-300">
                    <p>
                      O projeto <strong className="text-white">{deleteModalState.project?.nome}</strong> não pode ser excluído fisicamente pois já possui dados consolidados na competição:
                    </p>
                    <div className="p-3 bg-arena-black/60 rounded-xl border border-arena-border space-y-1 font-mono text-[11px] text-arena-gold">
                      <div>• Rodadas vinculadas: {deleteModalState.history.roundsCount}</div>
                      <div>• Votos registrados: {deleteModalState.history.votesCount}</div>
                      <div>• Resultados computados: {deleteModalState.history.resultsCount}</div>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Para preservar a auditoria pública da premiação, você pode <strong>desativar</strong> o projeto. Ele ficará oculto das telas públicas sem violar o histórico.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Tem certeza de que deseja excluir permanentemente o projeto{' '}
                    <strong className="text-white">{deleteModalState.project?.nome}</strong>?
                    <br />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Este projeto não possui votos nem rodadas vinculadas e será removido definitivamente do Supabase.
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-arena-border/60 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleteModalState.isDeleting}
                onClick={() =>
                  setDeleteModalState({
                    isOpen: false,
                    project: null,
                    history: null,
                    isChecking: false,
                    isDeleting: false,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>

              {deleteModalState.history?.hasHistory ? (
                <AdminActionButton
                  variant="gold"
                  isLoading={deleteModalState.isDeleting}
                  onClick={handleConfirmDeactivateFromModal}
                >
                  Desativar Projeto
                </AdminActionButton>
              ) : (
                <AdminActionButton
                  variant="danger"
                  isLoading={deleteModalState.isDeleting}
                  disabled={deleteModalState.isChecking}
                  onClick={handleConfirmDelete}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Excluir Permanentemente
                </AdminActionButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProjectsPage;
