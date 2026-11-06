import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { ProjectScoringResult } from '@/utils/scoring';
import { Users } from 'lucide-react';

interface ParticipationChartProps {
  projects: ProjectScoringResult[];
}

export const ParticipationChart: React.FC<ParticipationChartProps> = ({ projects }) => {
  const totalEventVotes = projects.reduce((acc, p) => acc + (p.totalVotes || 0), 0);

  const data = projects.map((p) => {
    const share = totalEventVotes > 0 ? ((p.totalVotes || 0) / totalEventVotes) * 100 : 0;
    return {
      name: p.name.length > 20 ? `${p.name.substring(0, 18)}...` : p.name,
      fullName: p.name,
      votos: p.totalVotes || 0,
      participacao: Number(share.toFixed(1)),
      rank: p.rank,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      return (
        <div className="bg-arena-card/95 border border-arena-border backdrop-blur-md p-3 rounded-xl shadow-2xl text-xs space-y-1 min-w-[180px]">
          <p className="font-extrabold text-white border-b border-arena-border/60 pb-1">{item.fullName}</p>
          <div className="flex justify-between items-center text-[11px] text-gray-300">
            <span>Total de Votos:</span>
            <span className="font-mono font-bold text-arena-blueLight">{item.votos} votos</span>
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-300">
            <span>Participação:</span>
            <span className="font-mono font-bold text-emerald-400">{item.participacao}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (index: number) => {
    const colors = ['#F20524', '#00B8F5', '#FFC400', '#00E676', '#8B5CF6'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-arena-border/50 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-arena-red" />
            Engajamento e Participação do Público
          </h3>
          <p className="text-xs text-gray-400">
            Distribuição de votos por projeto em tempo real no evento.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
          <span className="text-gray-400">Total Geral de Votos:</span>
          <span className="font-extrabold text-white font-mono text-sm">{totalEventVotes}</span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            layout="horizontal"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={{ stroke: '#374151' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
