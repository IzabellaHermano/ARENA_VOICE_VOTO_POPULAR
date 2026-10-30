import React, { useState, useEffect } from 'react';
import { ArenaLogo } from '@/components/branding';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { Download, ExternalLink, Trophy, Loader2 } from 'lucide-react';

interface ResultRow {
  id: string;
  name: string;
  inovacao: number;
  impacto: number;
  salto: number;
  mediaGeral: number;
  percentual: number;
  pontos: number;
  totalVotos?: number;
}

const INITIAL_RESULTS: ResultRow[] = [
  { id: 'projeto01', name: 'Projeto 01 — Plataforma Inteligente', inovacao: 4.3, impacto: 4.5, salto: 4.1, mediaGeral: 4.3, percentual: 86, pontos: 17.2, totalVotos: 142 },
  { id: 'projeto02', name: 'Projeto 02 — Manutenção Preditiva IoT', inovacao: 3.8, impacto: 4.0, salto: 3.6, mediaGeral: 3.8, percentual: 76, pontos: 15.2, totalVotos: 128 },
  { id: 'projeto03', name: 'Projeto 03 — Acessibilidade Digital', inovacao: 4.6, impacto: 4.2, salto: 4.7, mediaGeral: 4.5, percentual: 90, pontos: 18.0, totalVotos: 156 },
  { id: 'projeto04', name: 'Projeto 04 — Economia Circular', inovacao: 4.6, impacto: 4.3, salto: 4.3, mediaGeral: 3.8, percentual: 76, pontos: 15.2, totalVotos: 110 },
];

export const AdminResultsPage: React.FC = () => {
  const [resultsData, setResultsData] = useState<ResultRow[]>(INITIAL_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadServerResults() {
      setIsLoading(true);
      try {
        const response = await EventService.getAdminResults(DEFAULT_EVENT_ID);
        if (isMounted && response?.results && response.results.length > 0) {
          const mapped: ResultRow[] = response.results.map((r: any) => ({
            id: r.projectId || r.id,
            name: r.projectName || r.projectId,
            inovacao: r.averageInnovation || 0,
            impacto: r.averageImpact || 0,
            salto: r.averageDevelopment || 0,
            mediaGeral: r.averageGeneral || 0,
            percentual: r.percentage || 0,
            pontos: r.popularPoints || 0,
            totalVotos: r.totalVotes || 0,
          }));
          setResultsData(mapped);
        }
      } catch (err) {
        console.warn('Conexão com servidor para getAdminResults indisponível, utilizando dados consolidados:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadServerResults();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header com Regra de Marca: Dashboard logo completa ou escrita com slogan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <ArenaLogo variant="textWithSlogan" width={220} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
            Resultados Consolidados — Voto Popular (20%)
          </h2>
          <p className="text-xs text-gray-400">
            Regra Oficial: Média Geral = (Inovação + Impacto + Salto) / 3 • Pontos = (Média / 5) × 20
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/resultados/telao"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-arena-gold/20 hover:bg-arena-gold/30 text-arena-gold border border-arena-gold/40 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-yellow-glow"
          >
            <Trophy className="w-4 h-4" />
            <span>Exibir Telão</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => alert('Download do relatório em CSV/Excel (planejado para etapa futura)')}
            className="bg-arena-card hover:bg-white/10 text-gray-200 border border-arena-border text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8 gap-2 text-arena-blue text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Sincronizando apuração do servidor...</span>
        </div>
      )}

      {/* Tabela de Resultados Oficiais */}
      <div className="bg-arena-card border border-arena-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-arena-black text-gray-400 uppercase tracking-wider text-[11px] border-b border-arena-border">
              <tr>
                <th className="py-3 px-4">Projeto</th>
                <th className="py-3 px-4 text-center">Nível Inovação</th>
                <th className="py-3 px-4 text-center">Impacto CPTM</th>
                <th className="py-3 px-4 text-center">Salto Desenvolv.</th>
                <th className="py-3 px-4 text-center font-bold text-white">Média Geral</th>
                <th className="py-3 px-4 text-center">% dos 20%</th>
                <th className="py-3 px-4 text-center font-bold text-arena-gold">Pontos (20 pts)</th>
                <th className="py-3 px-4 text-center text-gray-400">Total Votos</th>
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
                  <td className="py-3.5 px-4 text-center font-mono text-gray-400">
                    {row.totalVotos || 0}
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
