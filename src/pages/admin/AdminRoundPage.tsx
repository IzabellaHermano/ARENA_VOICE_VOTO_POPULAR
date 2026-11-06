import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, RoundStatus as RoundStatusType, RoundDocument, ResultDocument } from '@/types';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { AdminMockService } from '@/services/adminMockService';
import {
  RoundStatus,
  RoundTimer,
  VoteCounter,
  AdminActionButton,
} from '@/components/admin';
import { Square, FastForward, BarChart2, RadioTower, Play, Layers, AlertCircle, QrCode, Tv } from 'lucide-react';

export const AdminRoundPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [currentRoundDoc, setCurrentRoundDoc] = useState<RoundDocument | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [roundStatus, setRoundStatus] = useState<RoundStatusType>('aberta');
  const [seconds, setSeconds] = useState(0);
  const [votesCount, setVotesCount] = useState(0);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Escuta o evento em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToCurrentEvent(DEFAULT_EVENT_ID, (ev) => {
      if (ev) {
        setActiveEvent(ev);
      }
    });
    return () => unsub();
  }, []);

  // 2. Escuta a lista de projetos em tempo real
  useEffect(() => {
    const unsub = EventService.subscribeToProjectsList(DEFAULT_EVENT_ID, (projs) => {
      if (projs && projs.length > 0) {
        setProjectsList(
          projs.map((p) => ({
            id: p.id || '',
            nome: p.name,
            descricao: p.description,
            bannerUrl: p.bannerUrl,
            ordem: p.order,
            ativo: p.active,
          }))
        );
      } else {
        setProjectsList(AdminMockService.getProjects());
      }
    });
    return () => unsub();
  }, []);

  // 3. Escuta a rodada ativa em tempo real quando houver currentRoundId
  const roundId = activeEvent?.currentRoundId;
  useEffect(() => {
    if (!roundId) {
      // Fallback local
      const mockRound = AdminMockService.getRound();
      setRoundStatus(mockRound.status);
      const proj = AdminMockService.getProjects().find((p) => p.id === mockRound.projetoAtualId);
      if (proj) setCurrentProject(proj);
      return;
    }

    const unsub = EventService.subscribeToActiveRound(roundId, (round) => {
      if (round) {
        setCurrentRoundDoc(round);
        const mappedStatus: RoundStatusType =
          round.status === 'open'
            ? 'aberta'
            : round.status === 'closed'
            ? 'encerrada'
            : 'aguardando';
        setRoundStatus(mappedStatus);

        // Busca o projeto vinculado
        const proj = projectsList.find((p) => p.id === round.projectId);
        if (proj) setCurrentProject(proj);
      }
    });

    return () => unsub();
  }, [roundId, projectsList]);

  // 4. TEMPO DA RODADA: Calculado a partir do horário registrado pelo servidor (startedAt)
  // Não reinicia a contagem ao atualizar a página!
  useEffect(() => {
    if (roundStatus !== 'aberta' || !currentRoundDoc?.startedAt) {
      if (roundStatus !== 'aberta') {
        // Pausado ou encerrado
      }
      return;
    }

    const calculateElapsed = () => {
      if (!currentRoundDoc.startedAt) return 0;
      let startMillis = 0;
      if (typeof currentRoundDoc.startedAt === 'object' && 'toMillis' in currentRoundDoc.startedAt) {
        startMillis = currentRoundDoc.startedAt.toMillis();
      } else if (typeof currentRoundDoc.startedAt === 'string') {
        startMillis = new Date(currentRoundDoc.startedAt).getTime();
      } else if (typeof currentRoundDoc.startedAt === 'number') {
        startMillis = currentRoundDoc.startedAt;
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - startMillis) / 1000));
      return elapsed;
    };

    setSeconds(calculateElapsed());

    const timer = setInterval(() => {
      setSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [roundStatus, currentRoundDoc?.startedAt]);

  // 5. VOTOS RECEBIDOS: Sincronizados em tempo real via Firestore do documento de resultado
  const projectId = currentRoundDoc?.projectId || activeEvent?.currentProjectId;
  useEffect(() => {
    if (!projectId) return;

    const unsub = EventService.subscribeToProjectResult(DEFAULT_EVENT_ID, projectId, (resDoc: ResultDocument | null) => {
      if (resDoc && typeof resDoc.totalVotes === 'number') {
        setVotesCount(resDoc.totalVotes);
      }
    });

    return () => unsub();
  }, [projectId]);

  // AÇÃO: Encerrar Avaliação (Vermelho)
  const handleCloseRound = async () => {
    if (!roundId) {
      setRoundStatus('encerrada');
      return;
    }

    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.closeRound(DEFAULT_EVENT_ID, roundId);
      setRoundStatus('closed' as any);
    } catch (err: unknown) {
      console.warn('Falha ao encerrar rodada via Cloud Function:', err);
      setRoundStatus('encerrada');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // AÇÃO: Liberar Avaliação (Dourado)
  const handleOpenRound = async () => {
    if (!projectId) return;

    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.openRound(DEFAULT_EVENT_ID, projectId);
      setRoundStatus('open' as any);
    } catch (err: unknown) {
      console.warn('Falha ao abrir rodada via Cloud Function:', err);
      setRoundStatus('aberta');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // AÇÃO: Próximo Projeto (Azul) — Não deverá abrir automaticamente a próxima votação!
  const handleNextProject = async () => {
    setIsLoadingAction(true);
    setErrorMessage(null);

    try {
      await EventService.prepareNextRound(DEFAULT_EVENT_ID);
      setRoundStatus('waiting' as any);
    } catch (err: unknown) {
      console.warn('Falha ao preparar próximo projeto via Cloud Function:', err);
      // Fallback local
      if (projectsList.length > 0) {
        const currentIndex = projectsList.findIndex((p) => p.id === projectId);
        const nextIndex = (currentIndex + 1) % projectsList.length;
        setCurrentProject(projectsList[nextIndex]);
        setRoundStatus('aguardando');
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Normalização de status
  const normalizedStatus: RoundStatusType = roundStatus;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header com Indicador de Conexão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider mb-2">
            <RadioTower className="w-3.5 h-3.5 animate-pulse" />
            <span>Transmissão em Tempo Real</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Controle da Rodada no Servidor
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Sincronização instantânea com os celulares do público e consolidação de votos atômica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/qrcode"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Abrir tela de QR Code para escaneamento"
          >
            <QrCode className="w-3.5 h-3.5 text-arena-gold" />
            <span>QR Code</span>
          </a>

          <a
            href="/telao"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-arena-red to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-neon-glow text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Abrir Telão 16:9 Oficial"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Telão 16:9</span>
          </a>

          <RoundStatus status={normalizedStatus} />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid Principal: Projeto em Avaliação + Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card do Projeto em Avaliação no Momento */}
        <div className="lg:col-span-2 bg-arena-card border border-arena-border rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-arena-border/60 pb-3 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                Projeto em avaliação no momento
              </span>
              <span className="text-xs font-mono font-bold text-arena-gold">
                Ordem #{currentProject?.ordem || 1}
              </span>
            </div>

            {/* Banner do Projeto */}
            <div className="relative h-44 sm:h-52 rounded-2xl bg-gradient-to-br from-[#0c182d] via-[#101c30] to-[#070e1a] border border-arena-border flex items-center justify-center overflow-hidden mb-4 shadow-inner">
              {currentProject?.bannerUrl ? (
                <img
                  src={currentProject.bannerUrl}
                  alt={currentProject.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-arena-blue shadow-blue-glow">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    Banner do Projeto
                  </span>
                </div>
              )}
            </div>

            {/* Nome e Categoria */}
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                {currentProject?.nome || 'Nenhum projeto ativo'}
              </h3>
              {currentProject?.categoria && (
                <p className="text-sm font-semibold text-arena-gold">
                  {currentProject.categoria}
                </p>
              )}
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                {currentProject?.descricao || 'Sem descrição cadastrada.'}
              </p>
            </div>
          </div>
        </div>

        {/* Métricas em Tempo Real: Participação e Cronômetro do Servidor */}
        <div className="flex flex-col justify-between gap-5">
          <VoteCounter count={votesCount} />
          <RoundTimer seconds={seconds} isActive={normalizedStatus === 'aberta'} />

          {/* Quick Info Box */}
          <div className="bg-arena-card/80 border border-arena-border rounded-2xl p-4 text-xs text-gray-400 space-y-2">
            <div className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">
              Sincronização em Tempo Real:
            </div>
            <p className="leading-relaxed">
              O cronômetro utiliza o timestamp do servidor (<span className="text-white font-mono">startedAt</span>), mantendo a integridade mesmo se a aba for atualizada. O contador de votos reflete as transações atômicas instantâneas.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Ações: Botões de Controle */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Se a rodada estiver em 'aguardando', exibe botão Dourado para liberar */}
          {normalizedStatus === 'aguardando' && (
            <AdminActionButton
              onClick={handleOpenRound}
              variant="gold"
              isLoading={isLoadingAction}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              LIBERAR AVALIAÇÃO
            </AdminActionButton>
          )}

          {/* Botão Vermelho: Encerrar Avaliação ou Reabrir */}
          {normalizedStatus === 'aberta' && (
            <AdminActionButton
              onClick={handleCloseRound}
              variant="danger"
              isLoading={isLoadingAction}
              icon={<Square className="w-4 h-4 fill-current" />}
            >
              ENCERRAR AVALIAÇÃO
            </AdminActionButton>
          )}

          {normalizedStatus === 'encerrada' && (
            <AdminActionButton
              onClick={handleOpenRound}
              variant="primary"
              isLoading={isLoadingAction}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              REABRIR AVALIAÇÃO
            </AdminActionButton>
          )}

          {/* Botão Azul: Próximo Projeto (não abre automaticamente a próxima votação) */}
          <AdminActionButton
            onClick={handleNextProject}
            variant="primary"
            isLoading={isLoadingAction}
            icon={<FastForward className="w-4 h-4 fill-current" />}
          >
            PRÓXIMO PROJETO
          </AdminActionButton>
        </div>

        {/* Botão Secundário: Gerar Dashboard */}
        <AdminActionButton
          onClick={() => navigate('/admin/resultados')}
          variant="secondary"
          icon={<BarChart2 className="w-4 h-4 text-arena-gold" />}
          className="w-full sm:w-auto ml-auto"
        >
          GERAR DASHBOARD
        </AdminActionButton>
      </div>
    </div>
  );
};

export default AdminRoundPage;
