import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, FastForward, BarChart2, Users, Clock } from 'lucide-react';

export const AdminRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(88); // 01:28
  const [votesCount] = useState(142);
  const [status, setStatus] = useState<'aberta' | 'encerrada'>('aberta');

  useEffect(() => {
    if (status !== 'aberta') return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-white">Controle da Rodada em Andamento</h2>
        <p className="text-xs text-gray-400 mt-1">
          Acompanhamento de métricas e status da votação em tempo real
        </p>
      </div>

      {/* Main Round Card & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Being Evaluated */}
        <div className="lg:col-span-2 bg-arena-card border border-arena-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              Projeto em avaliação no momento
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                status === 'aberta'
                  ? 'bg-arena-green/20 text-arena-green border border-arena-green/40 shadow-green-glow'
                  : 'bg-arena-red/20 text-arena-red border border-arena-red/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              {status === 'aberta' ? 'Votação aberta' : 'Votação encerrada'}
            </span>
          </div>

          <div className="h-40 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl flex items-center justify-center text-sm font-semibold text-gray-300 uppercase tracking-widest border border-arena-border">
            Banner do Projeto
          </div>

          <div className="text-center py-1">
            <h3 className="text-2xl font-black text-white">Projeto 01</h3>
            <p className="text-xs text-gray-400">Plataforma Inteligente de Gestão e Mobilidade</p>
          </div>
        </div>

        {/* Real-time Metrics */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Votos Recebidos */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-arena-blue/20 border border-arena-blue/40 flex items-center justify-center text-arena-blue shadow-blue-glow">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Participação do público</div>
              <div className="text-3xl font-black text-white">{votesCount}</div>
              <div className="text-[10px] text-arena-green">votos recebidos</div>
            </div>
          </div>

          {/* Tempo Decorrido */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-arena-gold/20 border border-arena-gold/40 flex items-center justify-center text-arena-gold shadow-gold-glow">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Tempo da rodada</div>
              <div className="text-3xl font-black font-mono text-white">
                {formatTime(seconds)}
              </div>
              <div className="text-[10px] text-gray-400">tempo decorrido</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="pt-4 flex flex-wrap items-center gap-3 border-t border-arena-border/60">
        <button
          onClick={() => setStatus(status === 'aberta' ? 'encerrada' : 'aberta')}
          className="flex-1 sm:flex-initial bg-arena-red hover:bg-arena-redHover text-white font-bold px-6 py-3 rounded-xl shadow-red-glow flex items-center justify-center gap-2 transition-all"
        >
          <Square className="w-4 h-4 fill-current" />
          <span>{status === 'aberta' ? 'ENCERRAR AVALIAÇÃO' : 'REABRIR AVALIAÇÃO'}</span>
        </button>

        <button
          onClick={() => navigate('/admin/projetos')}
          className="flex-1 sm:flex-initial bg-arena-blue hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-blue-glow flex items-center justify-center gap-2 transition-all"
        >
          <FastForward className="w-4 h-4 fill-current" />
          <span>PRÓXIMO PROJETO</span>
        </button>

        <button
          onClick={() => navigate('/admin/resultados')}
          className="w-full sm:w-auto ml-auto bg-arena-card hover:bg-white/10 text-gray-300 hover:text-white border border-arena-border font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <BarChart2 className="w-4 h-4 text-arena-gold" />
          <span>GERAR DASHBOARD</span>
        </button>
      </div>
    </div>
  );
};

export default AdminRoundPage;

