import React from 'react';
import { ShieldCheck, Database, Sliders } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white">Configurações do Sistema</h2>
        <p className="text-xs text-gray-400 mt-1">
          Ajustes de segurança, critérios de avaliação e conexões do Firebase
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Parâmetros de Avaliação */}
        <div className="bg-arena-card border border-arena-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sliders className="w-4 h-4 text-arena-red" />
            <span>Critérios de Avaliação (3)</span>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
            <li>Nível de Inovação (Escala 1 a 5)</li>
            <li>Impacto do Projeto na CPTM (Escala 1 a 5)</li>
            <li>Salto de Desenvolvimento do Projeto (Escala 1 a 5)</li>
          </ul>
          <p className="text-[11px] text-gray-400">
            Cada critério possui o mesmo peso e a pontuação final compõe 20% da nota global.
          </p>
        </div>

        {/* Segurança e Votação Única */}
        <div className="bg-arena-card border border-arena-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-arena-green" />
            <span>Regras de Segurança & Voto Único</span>
          </div>
          <ul className="text-xs text-gray-300 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-arena-green" />
              UID anônimo gerado via Firebase Auth
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-arena-green" />
              Chave do documento: `projetoId_uid`
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-arena-green" />
              Restrição no Firestore Security Rules
            </li>
          </ul>
        </div>

        {/* Integração Firebase */}
        <div className="bg-arena-card border border-arena-border rounded-xl p-5 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Database className="w-4 h-4 text-arena-blue" />
            <span>Ambiente Firebase & Emuladores</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-arena-dark/70 p-3 rounded-lg border border-arena-border">
              <span className="text-gray-400 block text-[10px] uppercase">Firestore Real-time</span>
              <span className="font-semibold text-white">Ativo (Coleções preparadas)</span>
            </div>
            <div className="bg-arena-dark/70 p-3 rounded-lg border border-arena-border">
              <span className="text-gray-400 block text-[10px] uppercase">Auth Spark</span>
              <span className="font-semibold text-white">Anônimo + Email Admin</span>
            </div>
            <div className="bg-arena-dark/70 p-3 rounded-lg border border-arena-border">
              <span className="text-gray-400 block text-[10px] uppercase">Hosting</span>
              <span className="font-semibold text-white">SSL Automático HTTPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
