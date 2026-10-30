import React from 'react';
import { ArenaLogo } from '@/components/branding';
import { Download, ExternalLink, Trophy } from 'lucide-react';

export const AdminResultsPage: React.FC = () => {
  const resultsData = [
    { id: 'proj01', name: 'Projeto 01', inovacao: 4.3, impacto: 4.5, salto: 4.1, mediaGeral: 4.3, percentual: 86, pontos: 17.2 },
    { id: 'proj02', name: 'Projeto 02', inovacao: 3.8, impacto: 4.0, salto: 3.6, mediaGeral: 3.8, percentual: 76, pontos: 15.2 },
    { id: 'proj03', name: 'Projeto 03', inovacao: 4.6, impacto: 4.2, salto: 4.7, mediaGeral: 4.5, percentual: 90, pontos: 18.0 },
    { id: 'proj04', name: 'Projeto 04', inovacao: 4.6, impacto: 4.3, salto: 4.3, mediaGeral: 3.8, percentual: 76, pontos: 15.2 },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header com Regra de Marca: Dashboard logo completa ou escrita com slogan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <ArenaLogo variant="textWithSlogan" width={220} />
          </div>
          <h2 className="text-xl font-bold text-white mt-2">
            Resultados Consolidados — Voto Popular (20%)
          </h2>
          <p className="text-xs text-gray-400">
            Regra: Média Geral = (Inovação + Impacto + Salto) / 3 • Pontos = (Média / 5) × 20
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/resultados/telao"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-arena-gold/20 hover:bg-arena-gold/30 text-arena-gold border border-arena-gold/40 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-gold-glow"
          >
            <Trophy className="w-4 h-4" />
            <span>Exibir Telão</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => alert('Download do relatório em CSV/Excel (planejado para etapa futura)')}
            className="bg-arena-card hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabela de Resultados Oficiais */}
      <div className="bg-arena-card border border-arena-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-arena-dark/80 text-gray-400 uppercase tracking-wider text-[11px] border-b border-arena-border">
              <tr>
                <th className="py-3 px-4">Projeto</th>
                <th className="py-3 px-4 text-center">Nível Inovação</th>
                <th className="py-3 px-4 text-center">Impacto CPTM</th>
                <th className="py-3 px-4 text-center">Salto Desenvolv.</th>
                <th className="py-3 px-4 text-center font-bold text-white">Média Geral</th>
                <th className="py-3 px-4 text-center">% dos 20%</th>
                <th className="py-3 px-4 text-center font-bold text-arena-gold">Pontos (20 pts)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/50 text-gray-200">
              {resultsData.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-arena-red" />
                    {row.name}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">{row.inovacao.toFixed(1)}</td>
                  <td className="py-3.5 px-4 text-center font-mono">{row.impacto.toFixed(1)}</td>
                  <td className="py-3.5 px-4 text-center font-mono">{row.salto.toFixed(1)}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-white bg-white/5">
                    {row.mediaGeral.toFixed(1)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">{row.percentual}%</td>
                  <td className="py-3.5 px-4 text-center font-mono font-extrabold text-arena-gold text-sm bg-arena-gold/5">
                    {row.pontos.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminResultsPage;

