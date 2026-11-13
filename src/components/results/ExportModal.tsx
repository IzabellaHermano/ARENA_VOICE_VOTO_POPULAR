import React from 'react';
import { ProjectScoringResult } from '@/utils/scoring';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportReports';
import { FileSpreadsheet, FileText, Printer, X, Download } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ProjectScoringResult[];
  eventName?: string;
  popularVoteWeight?: number;
  questions?: Array<{ id: string; title: string; position?: number }>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  results,
  eventName = 'Arena Voice 2026',
  popularVoteWeight,
  questions,
}) => {
  if (!isOpen) return null;
  const effectiveWeight = popularVoteWeight ?? results[0]?.popularVoteWeight ?? 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-arena-card border border-arena-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-arena-gold/20 text-arena-gold border border-arena-gold/30 text-[10px] font-bold uppercase tracking-wider">
            <Download className="w-3 h-3" />
            <span>Exportação de Relatórios</span>
          </div>
          <h3 className="text-xl font-black text-white">
            Exportar Resultados Oficiais
          </h3>
          <p className="text-xs text-gray-400">
            Selecione o formato para download dos dados consolidados do Voto Popular ({effectiveWeight}%).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2">
          {/* Botão CSV */}
          <button
            onClick={() => {
              exportToCSV(results, eventName, effectiveWeight, questions);
              onClose();
            }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                Arquivo CSV (.csv)
              </h4>
              <p className="text-xs text-gray-400">
                Codificado em UTF-8 com BOM e delimitador ';' para abertura direta no Microsoft Excel e Google Sheets.
              </p>
            </div>
          </button>

          {/* Botão Excel */}
          <button
            onClick={() => {
              exportToExcel(results, eventName, effectiveWeight, questions);
              onClose();
            }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-arena-blue/50 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-arena-blue/10 text-arena-blue flex items-center justify-center border border-arena-blue/30 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-arena-blue transition-colors">
                Planilha Excel (.xls)
              </h4>
              <p className="text-xs text-gray-400">
                Planilha formatada com cabeçalhos estilizados, colunas dimensionadas e formatos numéricos oficiais.
              </p>
            </div>
          </button>

          {/* Botão PDF / Imprimir */}
          <button
            onClick={() => {
              exportToPDF(results, eventName, effectiveWeight, questions);
              onClose();
            }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-arena-gold/50 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-arena-gold/10 text-arena-gold flex items-center justify-center border border-arena-gold/30 group-hover:scale-105 transition-transform">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-arena-gold transition-colors">
                Relatório Oficial em PDF
              </h4>
              <p className="text-xs text-gray-400">
                Abre visualização executiva otimizada para impressão ou salvamento em formato PDF pelo navegador.
              </p>
            </div>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-gray-500">
          Nota de Segurança: Os relatórios são estritamente gerados a partir dos dados agregados e não incluem identificadores anônimos (UIDs) dos votantes.
        </div>
      </div>
    </div>
  );
};

