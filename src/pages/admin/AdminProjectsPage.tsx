import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, Circle } from 'lucide-react';

export const AdminProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('projeto01');

  const projects = [
    { id: 'projeto01', name: 'Projeto 01', banner: 'Banner do Projeto' },
    { id: 'projeto02', name: 'Projeto 02', banner: 'Banner do Projeto' },
    { id: 'projeto03', name: 'Projeto 03', banner: 'Banner do Projeto' },
    { id: 'projeto04', name: 'Projeto 04', banner: 'Banner do Projeto' },
  ];

  const handleLiberarVotacao = () => {
    navigate('/admin/rodada');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-white">Selecione o projeto para avaliação</h2>
        <p className="text-xs text-gray-400 mt-1">
          O projeto selecionado será exibido instantaneamente em todas as telas do público via Firestore
        </p>
      </div>

      {/* Grid de Projetos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projects.map((proj) => {
          const isSelected = selectedProject === proj.id;
          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProject(proj.id)}
              className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-arena-red bg-arena-card shadow-red-glow'
                  : 'border-arena-border bg-arena-card/60 hover:border-gray-500'
              }`}
            >
              <div className="h-28 bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg flex items-center justify-center text-xs font-semibold uppercase text-gray-400">
                {proj.banner}
              </div>

              <div className="pt-3 pb-1 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{proj.name}</h4>
                  <span className="text-[11px] text-gray-400">
                    {isSelected ? 'Selecionado' : 'Disponível'}
                  </span>
                </div>

                <div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-arena-red fill-arena-red/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-arena-border/60">
        <div className="text-xs text-gray-400">
          Status atual: <span className="font-semibold text-arena-gold">Aguardando liberação</span>
        </div>

        <button
          onClick={handleLiberarVotacao}
          className="w-full sm:w-auto bg-arena-gold hover:bg-arena-goldLight text-black font-extrabold px-8 py-3 rounded-xl shadow-gold-glow flex items-center justify-center gap-2 transition-all transform active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>LIBERAR PROJETO PARA VOTAÇÃO</span>
        </button>
      </div>
    </div>
  );
};

export default AdminProjectsPage;

