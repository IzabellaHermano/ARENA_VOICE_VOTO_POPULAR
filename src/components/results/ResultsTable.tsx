import React, { useMemo } from 'react';
import { ProjectScoringResult } from '@/utils/scoring';
import { Table as TableIcon } from 'lucide-react';

interface ResultsTableProps {
  results: ProjectScoringResult[];
  questions?: Array<{ id: string; title: string; position?: number }>;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ results, questions }) => {
  const effectiveWeight = results[0]?.popularVoteWeight ?? 20;

  // Extrai dinamicamente as colunas de critérios presentes no evento
  const criteriaColumns = useMemo(() => {
    if (questions && questions.length > 0) {
      return [...questions]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((q) => q.title);
    }
    const titles = new Set<string>();
    results.forEach((r) => {
      r.criteriaScores?.forEach((c) => titles.add(c.title));
    });
    return Array.from(titles);
  }, [questions, results]);

  return (
    <div className="bg-arena-card border border-arena-border rounded-2xl overflow-hidden shadow-xl space-y-3 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-arena-border/50 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-arena-gold" />
            Tabela Detalhada de Indicadores e Pontuação
          </h3>
          <p className="text-xs text-gray-400">
            Cálculo oficial de {effectiveWeight}% da nota do evento com uma casa decimal e auditoria completa.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-black text-gray-400 uppercase tracking-wider text-[11px] border-b border-arena-border">
            <tr>
              <th className="py-3 px-3 text-center w-16">Posição</th>
              <th className="py-3 px-4">Projeto</th>
              <th className="py-3 px-3 text-center">Votos Válidos</th>
              {criteriaColumns.map((col) => (
                <th key={col} className="py-3 px-3 text-center">
                  {col}
                </th>
              ))}
              <th className="py-3 px-3 text-center font-bold text-white bg-white/5">Média Geral</th>
              <th className="py-3 px-3 text-center">% dos {effectiveWeight}%</th>
              <th className="py-3 px-4 text-center font-bold text-arena-gold bg-arena-gold/10">Pontos ({effectiveWeight} pts)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50 text-gray-200">
            {results.map((row) => {
              const isFirst = row.rank === 1;
              const isSecond = row.rank === 2;
              const isThird = row.rank === 3;

              return (
                <tr
                  key={row.projectId}
                  className={`hover:bg-white/5 transition-colors ${
                    isFirst ? 'bg-arena-gold/5 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 text-center">
                    {row.rank !== null ? (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          isFirst
                            ? 'bg-arena-gold text-black shadow-gold-glow'
                            : isSecond
                            ? 'bg-slate-300 text-black'
                            : isThird
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {row.rank}º
                      </span>
                    ) : (
                      <span className="text-gray-500 font-bold">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isFirst ? 'bg-arena-gold' : 'bg-arena-red'
                        }`}
                      />
                      <span>{row.name}</span>
                      {row.tie && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Empate
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-medium text-gray-300">
                    {row.totalVotes}
                  </td>

                  {criteriaColumns.map((col) => {
                    const found = row.criteriaScores?.find((c) => c.title === col);
                    return (
                      <td key={col} className="py-3.5 px-3 text-center font-mono">
                        {row.hasEvaluations && found ? found.formatted : 'Sem avaliações'}
                      </td>
                    );
                  })}

                  <td className="py-3.5 px-3 text-center font-mono font-extrabold text-white bg-white/5">
                    {row.formattedGeneral}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-gray-300">
                    {row.formattedPercentage}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono font-black text-arena-gold bg-arena-gold/10">
                    {row.formattedPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
