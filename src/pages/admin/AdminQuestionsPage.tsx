import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventQuestion } from '@/types/supabase';
import { QuestionService, CreateQuestionPayload, UpdateQuestionPayload } from '@/services/questionService';
import { useAdminEvent } from '@/contexts/AdminEventContext';
import {
  HelpCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Star,
  ListOrdered,
  X,
  Save,
  Trophy,
  ArrowLeftRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminQuestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentEventId, currentEvent, clearSelectedEvent } = useAdminEvent();

  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EventQuestion | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPosition, setModalPosition] = useState<number>(1);
  const [modalActive, setModalActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Exclusão
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    question: EventQuestion | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    question: null,
    isDeleting: false,
  });

  // Redireciona se nenhum evento estiver selecionado
  useEffect(() => {
    if (!currentEventId) {
      navigate('/admin/eventos', { replace: true });
    }
  }, [currentEventId, navigate]);

  // Carrega as perguntas do evento
  const loadQuestions = useCallback(async () => {
    if (!currentEventId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await QuestionService.listQuestions(currentEventId, true);
      setQuestions(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao carregar perguntas do evento.');
    } finally {
      setIsLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Auto-limpeza de mensagem de sucesso
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Abertura do Modal para Criação
  const handleOpenCreateModal = () => {
    setEditingQuestion(null);
    setModalTitle('');
    setModalDescription('');
    setModalPosition(questions.length + 1);
    setModalActive(true);
    setIsModalOpen(true);
  };

  // Abertura do Modal para Edição
  const handleOpenEditModal = (q: EventQuestion) => {
    setEditingQuestion(q);
    setModalTitle(q.title);
    setModalDescription(q.description || '');
    setModalPosition(q.position);
    setModalActive(q.active);
    setIsModalOpen(true);
  };

  // Salvar Criação ou Edição
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEventId || !modalTitle.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingQuestion) {
        // Atualização
        const payload: UpdateQuestionPayload = {
          title: modalTitle.trim(),
          description: modalDescription.trim(),
          position: modalPosition,
          active: modalActive,
        };
        await QuestionService.updateQuestion(currentEventId, editingQuestion.id, payload);
        setSuccessMessage(`Critério "${modalTitle.trim()}" atualizado com sucesso.`);
      } else {
        // Criação
        const payload: CreateQuestionPayload = {
          title: modalTitle.trim(),
          description: modalDescription.trim(),
          position: modalPosition,
          active: modalActive,
        };
        await QuestionService.createQuestion(currentEventId, payload);
        setSuccessMessage(`Novo critério "${modalTitle.trim()}" cadastrado com sucesso.`);
      }

      setIsModalOpen(false);
      await loadQuestions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar critério.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternar Ativo/Inativo
  const handleToggleActive = async (q: EventQuestion) => {
    if (!currentEventId) return;
    try {
      const nextActive = await QuestionService.toggleActive(currentEventId, q.id, q.active);
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, active: nextActive } : item))
      );
      setSuccessMessage(
        `Critério "${q.title}" ${nextActive ? 'ativado' : 'desativado'} para votações.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao alterar status da pergunta.');
    }
  };

  // Mover para Cima
  const handleMoveUp = async (index: number) => {
    if (index === 0 || !currentEventId) return;
    const newList = [...questions];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;

    const ids = newList.map((q) => q.id);
    setQuestions(newList.map((q, idx) => ({ ...q, position: idx + 1 })));

    try {
      await QuestionService.reorderQuestions(currentEventId, ids);
      setSuccessMessage('Ordem das perguntas atualizada.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao reordenar.');
      await loadQuestions();
    }
  };

  // Mover para Baixo
  const handleMoveDown = async (index: number) => {
    if (index === questions.length - 1 || !currentEventId) return;
    const newList = [...questions];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;

    const ids = newList.map((q) => q.id);
    setQuestions(newList.map((q, idx) => ({ ...q, position: idx + 1 })));

    try {
      await QuestionService.reorderQuestions(currentEventId, ids);
      setSuccessMessage('Ordem das perguntas atualizada.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao reordenar.');
      await loadQuestions();
    }
  };

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!currentEventId || !deleteModal.question) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      await QuestionService.deleteQuestion(currentEventId, deleteModal.question.id);
      setSuccessMessage(`Pergunta "${deleteModal.question.title}" removida.`);
      setDeleteModal({ isOpen: false, question: null, isDeleting: false });
      await loadQuestions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao excluir pergunta.');
      setDeleteModal({ isOpen: false, question: null, isDeleting: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Evento Selecionado */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-arena-gold/15 text-arena-gold border border-arena-gold/30 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Evento Selecionado
              </span>
              {currentEvent?.status && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-gray-300">
                  {currentEvent.status === 'active'
                    ? 'Em Andamento'
                    : currentEvent.status === 'finished'
                    ? 'Encerrado'
                    : 'Rascunho'}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {currentEvent?.name || 'Carregando evento...'}
            </h1>
            <p className="text-xs text-gray-400">
              Gerencie as perguntas e critérios de avaliação exclusivos deste evento. Cada pergunta utiliza uma escala obrigatória de 1 a 5 pontos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                clearSelectedEvent();
                navigate('/admin/eventos');
              }}
              className="px-3.5 py-2.5 rounded-xl border border-arena-border text-gray-300 hover:text-white hover:bg-white/5 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-arena-gold" />
              Trocar Evento
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-arena-red hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-red-glow transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Pergunta
            </button>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Lista de Perguntas */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-arena-border/50 pb-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-arena-gold" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Perguntas e Critérios de Avaliação ({questions.length})
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {questions.filter((q) => q.active).length} ativas para votação pública
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-arena-gold border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs">Carregando critérios de avaliação...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-3">
            <HelpCircle className="w-12 h-12 mx-auto text-gray-600" />
            <p className="text-sm font-semibold text-gray-300">Nenhum critério cadastrado para este evento.</p>
            <p className="text-xs max-w-md mx-auto">
              Clique em &quot;Nova Pergunta&quot; para definir as perguntas que os eleitores responderão durante a votação.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 px-4 py-2 rounded-xl bg-arena-red hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Critério
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => {
              const isFirst = index === 0;
              const isLast = index === questions.length - 1;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    q.active
                      ? 'bg-white/[0.03] border-arena-border/80 hover:border-arena-gold/50'
                      : 'bg-black/30 border-white/5 opacity-60'
                  }`}
                >
                  {/* Posição e Título */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/10 text-arena-gold font-bold font-mono text-sm flex items-center justify-center shrink-0 border border-arena-gold/30">
                      {q.position}º
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{q.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            q.active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {q.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {q.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">{q.description}</p>
                      )}

                      {/* Escala Visual de Avaliação 1 a 5 */}
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className="text-[10px] uppercase font-bold text-gray-500 mr-1">Escala fixa:</span>
                        {[1, 2, 3, 4, 5].map((score) => (
                          <span
                            key={score}
                            className="w-5 h-5 rounded bg-white/5 border border-white/10 text-center font-mono font-bold text-[10px] leading-5 text-gray-300"
                          >
                            {score}
                          </span>
                        ))}
                        <span className="text-[10px] text-gray-500 ml-1">(1 = Mínima • 5 = Máxima)</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações e Reordenação */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Botões de Reordenação */}
                    <div className="flex items-center border border-arena-border rounded-lg overflow-hidden bg-black/40 mr-2">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={isFirst}
                        title="Mover para cima"
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 hover:bg-white/10 transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={isLast}
                        title="Mover para baixo"
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 hover:bg-white/10 transition-colors border-l border-arena-border/60"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Botão de Ativar / Desativar */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(q)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        q.active
                          ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                          : 'border-gray-600 text-gray-400 hover:bg-gray-800'
                      }`}
                      title={q.active ? 'Desativar este critério' : 'Ativar este critério'}
                    >
                      {q.active ? 'Desativar' : 'Ativar'}
                    </button>

                    {/* Botão de Edição */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(q)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 border border-arena-border transition-colors"
                      title="Editar critério"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Botão de Exclusão */}
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ isOpen: true, question: q, isDeleting: false })}
                      className="p-2 rounded-lg text-gray-400 hover:text-arena-red hover:bg-arena-red/10 border border-arena-border transition-colors"
                      title="Excluir critério"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-arena-card border border-arena-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-arena-border/60 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-arena-gold" />
                {editingQuestion ? 'Editar Critério de Avaliação' : 'Novo Critério de Avaliação'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Enunciado ou Título da Pergunta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nível de Inovação, Viabilidade Técnica, Impacto Social..."
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-arena-black border border-arena-border rounded-xl px-4 py-2.5 text-white text-sm focus:border-arena-gold outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Orientação ou Descrição (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique ao eleitor o que deve ser considerado ao atribuir as notas de 1 a 5."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full bg-arena-black border border-arena-border rounded-xl px-4 py-2.5 text-white text-sm focus:border-arena-gold outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Posição na Lista
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={modalPosition}
                    onChange={(e) => setModalPosition(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-arena-black border border-arena-border rounded-xl px-4 py-2 text-white text-sm focus:border-arena-gold outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-arena-border hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={modalActive}
                      onChange={(e) => setModalActive(e.target.checked)}
                      className="w-4 h-4 accent-arena-red rounded"
                    />
                    <span className="text-xs font-bold text-gray-300">Critério Ativo</span>
                  </label>
                </div>
              </div>

              {/* Informação sobre a escala fixa de 1 a 5 */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-arena-border/50 text-xs text-gray-400 space-y-1">
                <div className="flex items-center gap-1.5 text-arena-gold font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Escala Obrigatória: 1 a 5 Pontos</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Todas as perguntas utilizam rigorosamente a escala de 1 a 5 pontos para manter a compatibilidade do cálculo oficial (0 a 20 pontos finais).
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-arena-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-arena-border text-gray-300 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !modalTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-arena-red hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-red-glow disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Salvando...' : 'Salvar Critério'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal de Exclusão */}
      {deleteModal.isOpen && deleteModal.question && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-arena-card border border-arena-red/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-arena-red">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-bold text-white">Excluir Critério</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Você está prestes a excluir o critério <strong className="text-white">&quot;{deleteModal.question.title}&quot;</strong> do evento ativo.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <p className="font-bold">Regra de Integridade Histórica:</p>
              <p className="text-[11px]">
                Se este critério já tiver votos registrados em qualquer rodada, a exclusão física será rejeitada pelo banco. Caso deseje retirá-lo de votações futuras, recomendamos utilizar a opção <strong>Desativar</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, question: null, isDeleting: false })}
                className="px-4 py-2 rounded-xl border border-arena-border text-gray-300 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteModal.isDeleting}
                className="px-4 py-2 rounded-xl bg-arena-red hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-red-glow disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleteModal.isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuestionsPage;

