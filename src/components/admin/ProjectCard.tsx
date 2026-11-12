import React from 'react';
import { Project } from '@/types';
import { CheckCircle2, Circle, Edit2, Power, Layers, Trash2 } from 'lucide-react';

export interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onToggleActive: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  onSelect,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  return (
    <div
      onClick={() => onSelect(project)}
      className={`group relative rounded-2xl border p-4 flex flex-col justify-between transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-arena-card border-arena-red shadow-red-glow ring-1 ring-arena-red/50'
          : 'bg-arena-card/80 border-arena-border hover:border-gray-500 hover:bg-arena-card'
      }`}
    >
      {/* Top Banner & Badges */}
      <div className="relative h-32 rounded-xl bg-gradient-to-br from-[#0c182d] via-[#101c30] to-[#070e1a] border border-arena-border/60 overflow-hidden flex items-center justify-center mb-3">
        {project.bannerUrl ? (
          <img
            src={project.bannerUrl}
            alt={project.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 gap-1">
            <Layers className="w-6 h-6 text-arena-blue/70" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Banner do Projeto
            </span>
          </div>
        )}

        {/* Ordem Badge */}
        <div className="absolute top-2 left-2 bg-arena-black/80 backdrop-blur-sm border border-arena-border px-2 py-0.5 rounded-md text-[11px] font-mono font-black text-white">
          #{project.ordem}
        </div>

        {/* Status Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider backdrop-blur-sm ${
            project.ativo
              ? 'bg-arena-green/20 text-arena-green border-arena-green/40 shadow-green-glow'
              : 'bg-gray-800/80 text-gray-400 border-gray-600'
          }`}
        >
          {project.ativo ? 'Ativo' : 'Inativo'}
        </div>
      </div>

      {/* Info Content */}
      <div className="space-y-1.5 mb-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-base font-black text-white group-hover:text-arena-gold transition-colors">
            {project.nome}
          </h4>
          <span className="shrink-0">
            {isSelected ? (
              <CheckCircle2 className="w-5 h-5 text-arena-red fill-arena-red/20" />
            ) : (
              <Circle className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />
            )}
          </span>
        </div>

        {project.categoria && (
          <p className="text-[11px] font-semibold text-arena-blue leading-tight">
            {project.categoria}
          </p>
        )}

        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
          {project.descricao || 'Sem descrição cadastrada.'}
        </p>
      </div>

      {/* Actions Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="pt-3 border-t border-arena-border/60 flex items-center justify-between text-xs gap-1"
      >
        <button
          type="button"
          onClick={() => onToggleActive(project)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            project.ativo
              ? 'text-gray-400 hover:text-arena-red hover:bg-white/5'
              : 'text-arena-green hover:bg-arena-green/10'
          }`}
          title={project.ativo ? 'Desativar projeto' : 'Ativar projeto'}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{project.ativo ? 'Desativar' : 'Ativar'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(project)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            title="Editar dados do projeto"
          >
            <Edit2 className="w-3.5 h-3.5 text-arena-gold" />
            <span>Editar</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(project)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-arena-red hover:bg-arena-red/10 transition-colors"
              title="Excluir projeto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

