import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';
import { AdminMockService } from '@/services/adminMockService';
import { ProjectCard, ProjectForm, AdminActionButton } from '@/components/admin';
import { Play, Plus, Sparkles } from 'lucide-react';

export const AdminProjectsPage: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('projeto01');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    const loaded = AdminMockService.getProjects();
    setProjects(loaded);

    const round = AdminMockService.getRound();
    if (round.projetoAtualId) {
      setSelectedProjectId(round.projetoAtualId);
    }
  }, []);

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
  };

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleToggleActive = (project: Project) => {
    const updated = projects.map((p) =>
      p.id === project.id ? { ...p, ativo: !p.ativo } : p
    );
    setProjects(updated);
    AdminMockService.saveProjects(updated);
  };

  const handleSaveProject = (data: Partial<Project>) => {
    let updated: Project[];
    if (editingProject) {
      updated = projects.map((p) =>
        p.id === editingProject.id ? ({ ...p, ...data } as Project) : p
      );
    } else {
      updated = [...projects, data as Project];
    }

    // Ordenar por número de ordem
    updated.sort((a, b) => a.ordem - b.ordem);

    setProjects(updated);
    AdminMockService.saveProjects(updated);
  };

  const handleLiberarVotacao = () => {
    const currentRound = AdminMockService.getRound();
    const updatedRound = {
      ...currentRound,
      projetoAtualId: selectedProjectId,
      status: 'aberta' as const,
      inicio: new Date().toISOString(),
      fim: undefined,
    };
    AdminMockService.saveRound(updatedRound);

    navigate('/admin/rodada');
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-blue/15 text-arena-blue border border-arena-blue/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestão dos Participantes</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Selecione o projeto que será avaliado
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Escolha o projeto ativo no palco e prepare a abertura da rodada para os celulares do público.
          </p>
        </div>

        <div>
          <AdminActionButton
            onClick={handleOpenCreateModal}
            variant="secondary"
            icon={<Plus className="w-4 h-4 text-arena-gold" />}
          >
            Cadastrar Projeto
          </AdminActionButton>
        </div>
      </div>

      {/* Grid de Cards dos Projetos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onSelect={handleSelectProject}
            onEdit={handleOpenEditModal}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {/* Barra de Ação Inferior — Botão Amarelo LIBERAR VOTAÇÃO */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="text-center sm:text-left">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Projeto selecionado para avaliação:
          </div>
          <div className="text-lg font-black text-white mt-0.5 flex items-center gap-2 justify-center sm:justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-arena-red animate-ping" />
            <span>{selectedProject?.nome || 'Nenhum selecionado'}</span>
            {selectedProject?.categoria && (
              <span className="text-xs text-arena-gold font-bold">
                • {selectedProject.categoria}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Ao liberar, os dispositivos do público carregarão instantaneamente este projeto para votação.
          </div>
        </div>

        <AdminActionButton
          onClick={handleLiberarVotacao}
          variant="gold"
          icon={<Play className="w-5 h-5 fill-current" />}
          className="w-full sm:w-auto py-3.5 px-8 text-sm"
        >
          LIBERAR VOTAÇÃO
        </AdminActionButton>
      </div>

      {/* Modal de Cadastro / Edição */}
      <ProjectForm
        isOpen={isModalOpen}
        projectToEdit={editingProject}
        totalProjects={projects.length}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
      />
    </div>
  );
};

export default AdminProjectsPage;
