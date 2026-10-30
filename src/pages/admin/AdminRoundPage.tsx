import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, RoundStatus as RoundStatusType } from '@/types';
import { AdminMockService } from '@/services/adminMockService';
import {
  RoundStatus,
  RoundTimer,
  VoteCounter,
  AdminActionButton,
} from '@/components/admin';
import { Square, FastForward, BarChart2, RadioTower, Play, Layers } from 'lucide-react';

export const AdminRoundPage: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [roundStatus, setRoundStatus] = useState<RoundStatusType>('aberta');
  const [seconds, setSeconds] = useState(88); // 01:28
  const [votesCount, setVotesCount] = useState(142);

  useEffect(() => {
    const loadedProjects = AdminMockService.getProjects();
    setProjects(loadedProjects);

    const round = AdminMockService.getRound();
    setRoundStatus(round.status);
    if (round.totalVotos !== undefined) {
      setVotesCount(round.totalVotos);
    }

    const proj = loadedProjects.find((p) => p.id === round.projetoAtualId) || loadedProjects[0];
    setCurrentProject(proj || null);
  }, []);

  // Timer da rodada
  useEffect(() => {
    if (roundStatus !== 'aberta') return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [roundStatus]);

  // Simulação discreta de votos chegando em tempo real enquanto a rodada estiver aberta
  useEffect(() => {
    if (roundStatus !== 'aberta') return;

    const voteInterval = setInterval(() => {
      setVotesCount((prev) => prev + Math.floor(Math.random() * 2));
    }, 3500);

    return () => clearInterval(voteInterval);
  }, [roundStatus]);

  // Ação 1: Encerrar Avaliação (Vermelho) ou Reabrir Avaliação
  const handleToggleEncerrar = () => {
    const newStatus: RoundStatusType = roundStatus === 'aberta' ? 'encerrada' : 'aberta';
    setRoundStatus(newStatus);

    const round = AdminMockService.getRound();
    AdminMockService.saveRound({
      ...round,
      status: newStatus,
      fim: newStatus === 'encerrada' ? new Date().toISOString() : undefined,
      totalVotos: votesCount,
    });
  };

  // Ação 2: Próximo Projeto (Azul) — NÃO deverá abrir automaticamente a próxima votação!
  const handleNextProject = () => {
    if (!projects.length || !currentProject) return;

    const currentIndex = projects.findIndex((p) => p.id === currentProject.id);
    const nextIndex = (currentIndex + 1) % projects.length;
    const nextProj = projects[nextIndex];

    setCurrentProject(nextProj);
    // Conforme especificação: coloca o status em 'aguardando' sem abrir automaticamente a votação
    setRoundStatus('aguardando');
    setSeconds(0);
    setVotesCount(0);

    const round = AdminMockService.getRound();
    AdminMockService.saveRound({
      ...round,
      projetoAtualId: nextProj.id,
      status: 'aguardando',
      inicio: undefined,
      fim: undefined,
      totalVotos: 0,
    });
  };

  // Abrir Votação quando estiver em 'aguardando'
  const handleOpenRound = () => {
    setRoundStatus('aberta');
    setSeconds(0);

    const round = AdminMockService.getRound();
    AdminMockService.saveRound({
      ...round,
      status: 'aberta',
      inicio: new Date().toISOString(),
      fim: undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header com Indicador de Conexão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-red/15 text-arena-red border border-arena-red/30 text-xs font-bold uppercase tracking-wider mb-2">
            <RadioTower className="w-3.5 h-3.5 animate-pulse" />
            <span>Transmissão ao Vivo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Controle da Rodada em Tempo Real
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Monitore o tempo decorrido, a contagem de votos e o status da votação sincronizada com o público.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RoundStatus status={roundStatus} />
        </div>
      </div>

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

        {/* Métricas em Tempo Real: Participação e Cronômetro */}
        <div className="flex flex-col justify-between gap-5">
          <VoteCounter count={votesCount} />
          <RoundTimer seconds={seconds} isActive={roundStatus === 'aberta'} />

          {/* Quick Info Box */}
          <div className="bg-arena-card/80 border border-arena-border rounded-2xl p-4 text-xs text-gray-400 space-y-2">
            <div className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">
              Regra de Operação:
            </div>
            <p className="leading-relaxed">
              O botão <span className="text-arena-blue font-bold">Próximo Projeto</span> avança o projeto e define o estado como <span className="text-arena-gold font-bold">Aguardando liberação</span>. O operador tem total controle para liberar a votação quando o apresentador autorizar.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Ações: Botões de Controle */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Se a rodada estiver em 'aguardando', exibe botão para liberar */}
          {roundStatus === 'aguardando' && (
            <AdminActionButton
              onClick={handleOpenRound}
              variant="gold"
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              LIBERAR AVALIAÇÃO
            </AdminActionButton>
          )}

          {/* Botão Vermelho: Encerrar Avaliação */}
          {roundStatus !== 'aguardando' && (
            <AdminActionButton
              onClick={handleToggleEncerrar}
              variant="danger"
              icon={<Square className="w-4 h-4 fill-current" />}
            >
              {roundStatus === 'aberta' ? 'ENCERRAR AVALIAÇÃO' : 'REABRIR AVALIAÇÃO'}
            </AdminActionButton>
          )}

          {/* Botão Azul: Próximo Projeto (não abre automaticamente a próxima votação) */}
          <AdminActionButton
            onClick={handleNextProject}
            variant="primary"
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
