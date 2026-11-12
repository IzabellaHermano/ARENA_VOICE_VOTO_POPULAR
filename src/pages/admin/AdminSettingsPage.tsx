import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventConfig, AdminUser, Project } from '@/types';
import { AdminMockService } from '@/services/adminMockService';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { useAdminEvent } from '@/contexts/AdminEventContext';
import { AdminActionButton } from '@/components/admin';
import {
  Sliders,
  Tv,
  Image,
  Users,
  Save,
  Check,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Clock,
  Layers,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentEventId } = useAdminEvent();
  const activeEventId = currentEventId || DEFAULT_EVENT_ID;

  // Redireciona para Meus Eventos se nenhum evento foi selecionado
  useEffect(() => {
    if (!currentEventId) {
      navigate('/admin/eventos', { replace: true });
    }
  }, [currentEventId, navigate]);

  const [eventConfig, setEventConfig] = useState<EventConfig>(() =>
    AdminMockService.getEventConfig()
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [admins] = useState<AdminUser[]>(() =>
    AdminMockService.getAdmins()
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Carrega lista real de projetos do Supabase ordenados por ordem
  useEffect(() => {
    if (!activeEventId) return;

    const unsub = EventService.subscribeToProjectsList(activeEventId, (projs) => {
      if (projs && projs.length > 0) {
        const sorted = [...projs]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((p) => ({
            id: p.id || '',
            nome: p.name,
            descricao: p.description,
            bannerUrl: p.bannerUrl,
            ordem: p.order,
            ativo: p.active,
            categoria: p.category || '',
          }));
        setProjects(sorted);
      } else {
        setProjects([]);
      }
    });

    return () => unsub();
  }, [activeEventId]);

  // 2. Mover projeto para cima ou para baixo na fila oficial
  const handleMoveProject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const copy = [...projects];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Atualiza a propriedade ordem sequencialmente (1, 2, 3...)
    const updated = copy.map((p, i) => ({ ...p, ordem: i + 1 }));
    setProjects(updated);
  };

  // 3. Salvar configurações gerais e persistir ordem no Supabase
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 3.1 Persiste a ordem de cada projeto no Supabase
      const updatePromises = projects.map((p) =>
        EventService.updateProject(p.id, { order: p.ordem })
      );
      await Promise.all(updatePromises);

      // 3.2 Salva configurações locais e no localStorage para acesso do Cronômetro
      AdminMockService.saveEventConfig(eventConfig);
      AdminMockService.saveProjects(projects);
      AdminMockService.saveAdmins(admins);

      localStorage.setItem('arena_voice_admin_event_config', JSON.stringify(eventConfig));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Falha ao salvar configurações:', err);
      setErrorMessage(err.message || 'Falha ao salvar configurações no Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-blue/15 text-arena-blue border border-arena-blue/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Painel de Controle Central</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Configurações Gerais do Arena Voice
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Parâmetros do evento, ordem oficial dos competidores, cronômetro regressivo e preferências do telão.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-arena-green/20 text-arena-green border border-arena-green/40 text-xs font-bold shadow-green-glow animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Configurações e ordem salvas no Supabase!</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. Informações Básicas do Evento e Status */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-2.5 text-base font-black text-white border-b border-arena-border/60 pb-3">
            <Sliders className="w-5 h-5 text-arena-red" />
            <span>Status e Identificação do Evento</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Nome Oficial do Evento
              </label>
              <input
                type="text"
                value={eventConfig.nomeEvento}
                onChange={(e) =>
                  setEventConfig({ ...eventConfig, nomeEvento: e.target.value })
                }
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Subtítulo / Slogan
              </label>
              <input
                type="text"
                value={eventConfig.subtitulo || ''}
                onChange={(e) =>
                  setEventConfig({ ...eventConfig, subtitulo: e.target.value })
                }
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Status Atual do Evento
              </label>
              <select
                value={eventConfig.statusEvento}
                onChange={(e) =>
                  setEventConfig({
                    ...eventConfig,
                    statusEvento: e.target.value as EventConfig['statusEvento'],
                  })
                }
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-blue transition-colors"
              >
                <option value="planejado">Planejado (Pré-evento)</option>
                <option value="em_andamento">Em Andamento (Ao Vivo)</option>
                <option value="pausado">Pausado (Intervalo)</option>
                <option value="encerrado">Encerrado (Finalizado)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Ordem Oficial de Apresentação dos Projetos (Persistida no Supabase) */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-arena-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-base font-black text-white">
              <Layers className="w-5 h-5 text-arena-gold" />
              <span>Ordem Oficial das Apresentações no Palco</span>
            </div>
            <span className="text-xs text-arena-gold font-mono font-bold">
              Total: {projects.length} projetos
            </span>
          </div>

          <p className="text-xs text-gray-400">
            A ordem definida abaixo será estritamente respeitada pelo botão <span className="text-white font-bold">"PRÓXIMO PROJETO"</span> no controle da rodada. Reorganize utilizando os botões de subir e descer.
          </p>

          <div className="space-y-2">
            {projects.map((proj, idx) => (
              <div
                key={proj.id}
                className="flex items-center justify-between p-3 rounded-xl bg-arena-black border border-arena-border hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-arena-card border border-arena-border flex items-center justify-center font-mono font-black text-xs text-arena-gold shadow-sm">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-sm text-white">{proj.nome}</span>
                    {proj.categoria && (
                      <span className="text-xs text-arena-blueLight ml-2">
                        • {proj.categoria}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 font-mono ml-2">
                      (ID: {proj.id})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveProject(idx, 'up')}
                    className="p-2 rounded-lg bg-arena-card hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 hover:text-white transition-colors"
                    title="Mover para cima na sequência"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === projects.length - 1}
                    onClick={() => handleMoveProject(idx, 'down')}
                    className="p-2 rounded-lg bg-arena-card hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 hover:text-white transition-colors"
                    title="Mover para baixo na sequência"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Configurações de Duração e Telão */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-2.5 text-base font-black text-white border-b border-arena-border/60 pb-3">
            <Tv className="w-5 h-5 text-arena-blue" />
            <span>Configurações do Cronômetro e Telão</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-arena-black border border-arena-border">
              <span className="text-xs font-bold text-gray-300 mb-2">
                Exibir Telão em Tempo Real
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventConfig.exibirTelaoTempoReal}
                  onChange={(e) =>
                    setEventConfig({
                      ...eventConfig,
                      exibirTelaoTempoReal: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-arena-green"></div>
                <span className="ml-3 text-xs text-gray-400 font-medium">
                  {eventConfig.exibirTelaoTempoReal ? 'Ativado' : 'Oculto'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-arena-gold" />
                <span>Tempo Padrão da Rodada (Segundos)</span>
              </label>
              <input
                type="number"
                min={30}
                max={600}
                value={eventConfig.tempoPadraoRodadaSegundos}
                onChange={(e) =>
                  setEventConfig({
                    ...eventConfig,
                    tempoPadraoRodadaSegundos: Number(e.target.value),
                  })
                }
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-arena-blue transition-colors"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Ex.: 120 segundos = 2 minutos de contagem regressiva no Telão.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Peso do Voto Popular (%)
              </label>
              <input
                type="number"
                disabled
                value={eventConfig.pesoVotoPopularPercentual}
                className="w-full bg-arena-black/60 border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-arena-gold font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Fixo em 20% conforme regulamento oficial da competição.
              </span>
            </div>
          </div>
        </div>

        {/* 4. Gerenciamento de Banners de Palco e Armazenamento */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-2.5 text-base font-black text-white border-b border-arena-border/60 pb-3">
            <Image className="w-5 h-5 text-arena-gold" />
            <span>Gerenciamento de Banners e Mídia</span>
          </div>

          <div className="text-xs text-gray-300 space-y-2">
            <p>
              Os banners são enviados diretamente para o <span className="text-white font-semibold">Supabase Storage</span> (bucket <span className="text-arena-gold font-mono">project-banners</span>) através do componente de upload na tela de Projetos.
            </p>
            <div className="p-3 rounded-xl bg-arena-black border border-arena-border flex items-center justify-between text-xs">
              <span className="text-gray-400">Armazenamento oficial:</span>
              <span className="font-mono text-arena-blue font-bold">
                Supabase Storage • bucket: project-banners (público)
              </span>
            </div>
          </div>
        </div>

        {/* 5. Gerenciamento de Administradores */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-arena-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-base font-black text-white">
              <Users className="w-5 h-5 text-arena-green" />
              <span>Equipe de Administradores Autorizados</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {admins.length} membros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-arena-black text-gray-400 uppercase tracking-wider text-[11px] border-b border-arena-border">
                <tr>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">E-mail Institucional</th>
                  <th className="py-2.5 px-3">Nível</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Último Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena-border/40 text-gray-200">
                {admins.map((adm) => (
                  <tr key={adm.uid} className="hover:bg-white/5">
                    <td className="py-3 px-3 font-bold text-white">{adm.nome}</td>
                    <td className="py-3 px-3 font-mono text-gray-300">{adm.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-arena-blue/15 text-arena-blue border border-arena-blue/30">
                        {adm.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-arena-green font-bold text-[11px]">Ativo</span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400 font-mono text-[11px]">
                      {adm.ultimoAcesso}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-arena-gold/10 border border-arena-gold/30 text-arena-gold text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Ações críticas (como exclusão de projetos ou alteração de notas) exigem autenticação administrativa válida via Supabase Auth e RLS no PostgreSQL.
            </span>
          </div>
        </div>

        {/* Botão de Salvar Alterações */}
        <div className="pt-2 flex justify-end">
          <AdminActionButton
            type="submit"
            variant="gold"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
            className="w-full sm:w-auto px-8 py-3.5"
          >
            SALVAR CONFIGURAÇÕES NO SUPABASE
          </AdminActionButton>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
