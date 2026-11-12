import React, { useState, useEffect } from 'react';
import { Project } from '@/types';
import { X, Save, AlertCircle } from 'lucide-react';
import { AdminActionButton } from './AdminActionButton';
import { ProjectBannerUpload } from './ProjectBannerUpload';

export interface ProjectFormProps {
  isOpen: boolean;
  projectToEdit?: Project | null;
  totalProjects: number;
  onClose: () => void;
  onSave: (projectData: Partial<Project>) => Promise<void> | void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  projectToEdit,
  totalProjects,
  onClose,
  onSave,
}) => {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectToEdit) {
      setNome(projectToEdit.nome || '');
      setCategoria(projectToEdit.categoria || '');
      setDescricao(projectToEdit.descricao || '');
      setBannerUrl(projectToEdit.bannerUrl || '');
      setOrdem(projectToEdit.ordem || 1);
      setAtivo(projectToEdit.ativo ?? true);
    } else {
      setNome('');
      setCategoria('');
      setDescricao('');
      setBannerUrl('');
      setOrdem(totalProjects + 1);
      setAtivo(true);
    }
    setError('');
    setIsSubmitting(false);
  }, [projectToEdit, totalProjects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome do projeto é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSave({
        id: projectToEdit ? projectToEdit.id : undefined,
        nome: nome.trim(),
        categoria: categoria.trim(),
        descricao: descricao.trim(),
        bannerUrl: bannerUrl.trim(),
        ordem: Number(ordem),
        ativo,
      });

      onClose();
    } catch (err: any) {
      console.error('Erro ao submeter formulário de projeto:', err);
      setError(err?.message || 'Falha ao salvar o projeto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-arena-card border border-arena-border rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-arena-border/60 pb-3 mb-5">
          <h3 className="text-lg font-black text-white">
            {projectToEdit ? 'Editar Projeto' : 'Cadastrar Novo Projeto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
              Nome do Projeto *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Projeto 01 — Sistema Inteligente"
              className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
              Categoria / Subtítulo
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Inovação Operacional e Mobilidade"
              className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
              Descrição Resumida
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o propósito da inovação e o impacto esperado..."
              className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-arena-blue transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                Ordem de Apresentação
              </label>
              <input
                type="number"
                min={1}
                value={ordem}
                onChange={(e) => setOrdem(Number(e.target.value))}
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-blue transition-colors font-mono"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-arena-black border border-arena-border cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded text-arena-red focus:ring-0 w-4 h-4 bg-arena-dark"
                />
                <span className="text-xs font-bold text-gray-200">
                  Projeto Ativo na Competição
                </span>
              </label>
            </div>
          </div>

          {/* Componente Oficial de Upload de Banners (Supabase Storage / Arquivo do Computador) */}
          <ProjectBannerUpload
            currentBannerUrl={bannerUrl}
            onBannerUploaded={(url) => setBannerUrl(url)}
            onBannerRemoved={() => setBannerUrl('')}
          />

          <div className="pt-4 border-t border-arena-border/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>

            <AdminActionButton
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              {isSubmitting
                ? 'Salvando no banco...'
                : projectToEdit
                ? 'Salvar Alterações'
                : 'Cadastrar Projeto'}
            </AdminActionButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
