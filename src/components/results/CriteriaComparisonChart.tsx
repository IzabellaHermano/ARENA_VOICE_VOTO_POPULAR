import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ProjectScoringResult } from '@/utils/scoring';
import { BarChart3 } from 'lucide-react';

interface CriteriaComparisonChartProps {
  projects: ProjectScoringResult[];
  questions?: Array<{ id: string; title: string; position?: number }>;
}

const CRITERIA_COLORS = [
  '#F20524', // Arena Red
  '#00B8F5', // Cyan / Arena Blue
  '#00E676', // Emerald Green
  '#9C27B0', // Purple
  '#FF9800', // Amber Orange
  '#E91E63', // Pink
  '#00BCD4', // Teal
  '#3F51B5', // Indigo
  '#8BC34A', // Light Green
  '#FF5722', // Deep Orange
];

export const CriteriaComparisonChart: React.FC<CriteriaComparisonChartProps> = ({ projects, questions }) => {
  // Extrai dinamicamente as chaves de critérios configuradas no evento
  const criteriaKeys = useMemo(() => {
    if (questions && questions.length > 0) {
      return [...questions]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((q) => q.title);
    }

    const keys = new Set<string>();
    projects.forEach((p) => {
      p.criteriaScores?.forEach((c) => keys.add(c.title));
    });
    return Array.from(keys);
  }, [questions, projects]);

  // Filtra projetos avaliados para o gráfico
  const data = useMemo(() => {
    return projects
      .filter((p) => p.hasEvaluations)
      .map((p) => {
        const item: Record<string, any> = {
          name: p.name.length > 20 ? `${p.name.substring(0, 18)}...` : p.name,
          fullName: p.name,
          'Média Geral': p.rawGeneral ? Number(p.rawGeneral.toFixed(2)) : 0,
        };

        criteriaKeys.forEach((key) => {
          const found = p.criteriaScores?.find((c) => c.title === key);
          item[key] = found && found.average !== null ? Number(found.average.toFixed(2)) : 0;
        });

        return item;
      });
  }, [projects, criteriaKeys]);

  if (data.length === 0) {
    return (
      <div className="bg-arena-card border border-arena-border rounded-2xl p-8 text-center text-gray-400">
        <BarChart3 className="w-8 h-8 mx-auto text-gray-600 mb-2" />
        <p className="text-sm font-semibold">Nenhum projeto com avaliações para comparação gráfica.</p>
        {criteriaKeys.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Critérios do evento: <span className="text-gray-300 font-medium">{criteriaKeys.join(' • ')}</span>
          </p>
        )}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const full = payload[0]?.payload?.fullName || label;
      return (
        <div className="bg-arena-card/95 border border-arena-border backdrop-blur-md p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <p className="font-extrabold text-white border-b border-arena-border/60 pb-1">{full}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center text-[11px]">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(1).replace('.', ',') : '0,0'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-arena-border/50 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-arena-blue" />
            Comparação por Critério de Avaliação
          </h3>
          <p className="text-xs text-gray-400">
            Escala oficial de 1 a 5 pontos por critério configurado para o evento.
          </p>
        </div>
      </div>

      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={{ stroke: '#374151' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
              formatter={(value) => <span className="text-gray-300 font-medium">{value}</span>}
            />
            {criteriaKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CRITERIA_COLORS[index % CRITERIA_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
            <Bar dataKey="Média Geral" fill="#FFC400" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CriteriaComparisonChart;
