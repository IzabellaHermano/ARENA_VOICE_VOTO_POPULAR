import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventSettings, EventSettingsHistoryItem, Project } from '@/types';
import { EventService, DEFAULT_EVENT_ID } from '@/services/eventService';
import { SettingsService } from '@/services/settingsService';
import { useAdminEvent } from '@/contexts/AdminEventContext';
import { AdminActionButton } from '@/components/admin';
import { formatCountdown } from '@/utils/approvalCalculator';
import {
  Sliders,
  Save,
  Check,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Clock,
  Layers,
  History,
  RotateCcw,
  Info,
  Percent,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentEventId, currentEvent, refreshCurrentEvent } = useAdminEvent();
  const activeEventId = currentEventId || DEFAULT_EVENT_ID;

  // Redireciona para Meus Eventos se nenhum evento foi selecionado
  useEffect(() => {
    if (!currentEventId) {
      navigate('/admin/eventos', { replace: true });
    }
  }, [currentEventId, navigate]);

  // Estados das configurações do evento ativo
  const [eventName, setEventName] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [popularWeight, setPopularWeight] = useState<number>(20);
  const [showRealtimeScreen, setShowRealtimeScreen] = useState<boolean>(true);

  // Estados de apoio
  const [initialSettings, setInitialSettings] = useState<EventSettings | null>(null);
  const [historyItems, setHistoryItems] = useState<EventSettingsHistoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWeightConfirm, setShowWeightConfirm] = useState(false);

  // 1. Carrega dados do evento e configurações específicas
  useEffect(() => {
    if (!activeEventId) return;

    let isMounted = true;

    async function loadData() {
      try {
        setErrorMessage(null);

        // 1.1 Configurações específicas do evento no Supabase
        const settings = await SettingsService.getSettings(activeEventId);
        if (!isMounted) return;

        setInitialSettings(settings);
        setDefaultDuration(settings.defaultRoundDuration);
        setPopularWeight(settings.popularVoteWeight);
        setShowRealtimeScreen(settings.showRealtimeScreen);

        // 1.2 Histórico auditável
        const history = await SettingsService.getHistory(activeEventId);
        if (isMounted) setHistoryItems(history);
      } catch (err: any) {
        console.warn('Erro ao carregar configurações do evento:', err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  // Sincroniza nome e descrição do evento
  useEffect(() => {
    if (currentEvent) {
      setEventName(currentEvent.name || '');
      setEventDescription(currentEvent.description || '');
    }
  }, [currentEvent]);

  // 2. Carrega lista real de projetos do Supabase ordenados por ordem
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

  // 3. Mover projeto para cima ou para baixo na fila oficial
  const handleMoveProject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const copy = [...projects];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const updated = copy.map((p, i) => ({ ...p, ordem: i + 1 }));
    setProjects(updated);
  };

  // 4. Salvar configurações gerais e persistir no Supabase
  const executeSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 4.1 Atualiza nome e descrição do evento no Supabase se alterados
      if (currentEvent && (currentEvent.name !== eventName || currentEvent.description !== eventDescription)) {
        await EventService.updateEvent(activeEventId, {
          name: eventName,
          description: eventDescription,
        });
        await refreshCurrentEvent();
      }

      // 4.2 Persiste a ordem de cada projeto no Supabase
      const updatePromises = projects.map((p) =>
        EventService.updateProject(p.id, { order: p.ordem })
      );
      await Promise.all(updatePromises);

      // 4.3 Persiste configurações individuais do evento no Supabase via SettingsService
      const updated = await SettingsService.updateSettings(activeEventId, {
        defaultRoundDuration: defaultDuration,
        popularVoteWeight: popularWeight,
        showRealtimeScreen: showRealtimeScreen,
      });

      setInitialSettings(updated);

      // Atualiza histórico
      const refreshedHistory = await SettingsService.getHistory(activeEventId);
      setHistoryItems(refreshedHistory);

      setSaveSuccess(true);
      setShowWeightConfirm(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Falha ao salvar configurações:', err);
      setErrorMessage(err.message || 'Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Se o peso do voto popular foi alterado, solicita confirmação para alertar sobre impacto
    if (initialSettings && initialSettings.popularVoteWeight !== popularWeight) {
      setShowWeightConfirm(true);
      return;
    }

    executeSave();
  };

  // 5. Recalcular Resultados explicitamente
  const handleRecalculateResults = async () => {
    if (!window.confirm(
      `Deseja realmente recalcular todos os resultados do evento "${eventName || activeEventId}" utilizando o peso atual de ${popularWeight}%?`
    )) {
      return;
    }

    setIsRecalculating(true);
    setRecalcSuccess(null);
    setErrorMessage(null);

    try {
      const res = await SettingsService.recalculateResults(activeEventId);
      setRecalcSuccess(`Resultados recalculados com sucesso para ${res.recalculatedCount} projeto(s)!`);
      setTimeout(() => setRecalcSuccess(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao recalcular resultados.');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header com identificação do Evento Ativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-arena-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena-gold/15 text-arena-gold border border-arena-gold/30 text-xs font-bold uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurações do Evento</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono text-[11px] font-bold">
              ID: {activeEventId}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {eventName || currentEvent?.name || 'Configurações do Evento'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Duração padrão das rodadas, peso do Voto Popular na pontuação oficial e preferências do telão.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-arena-green/20 text-arena-green border border-arena-green/40 text-xs font-bold shadow-green-glow animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        {recalcSuccess && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-arena-blue/20 text-arena-blue border border-arena-blue/40 text-xs font-bold animate-fade-in">
            <Check className="w-4 h-4" />
            <span>{recalcSuccess}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-red text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Banner de Aviso de Não-Retroatividade */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-arena-gold/10 via-arena-black to-arena-card border border-arena-gold/30 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-arena-gold shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-white">
            Isolamento e Preservação de Dados
          </p>
          <p className="text-gray-300 leading-relaxed">
            Alterações no tempo da rodada ou no peso do Voto Popular têm efeito <strong className="text-arena-gold">apenas nas próximas rodadas e cálculos futuros</strong>. Rodadas já encerradas e resultados previamente consolidados permanecem com suas configurações históricas preservadas.
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* 1. Identificação Básica do Evento */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-2.5 text-base font-black text-white border-b border-arena-border/60 pb-3">
            <Sliders className="w-5 h-5 text-arena-red" />
            <span>Identificação do Evento</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Nome do Evento
              </label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-gold transition-colors font-semibold"
                placeholder="Ex.: Arena Voice 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Descrição / Informações Adicionais
              </label>
              <input
                type="text"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-arena-gold transition-colors"
                placeholder="Ex.: Concurso de Inovação Aberta CPTM"
              />
            </div>
          </div>
        </div>

        {/* 2. Configurações Individuais de Duração e Cronômetro */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-arena-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-base font-black text-white">
              <Clock className="w-5 h-5 text-arena-gold" />
              <span>Duração Padrão das Rodadas</span>
            </div>
            <span className="text-xs font-mono font-bold text-arena-gold px-2.5 py-1 rounded-lg bg-arena-gold/10 border border-arena-gold/30">
              Formato MM:SS: {formatCountdown(defaultDuration)}
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Tempo limite oficial padrão para a votação de cada projeto deste evento. O operador também pode ajustar a duração específica antes de liberar qualquer rodada individual.
          </p>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-1">
                Atalhos rápidos:
              </span>
              {[30, 45, 60, 90, 120, 180].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setDefaultDuration(seconds)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    defaultDuration === seconds
                      ? 'bg-arena-gold text-black shadow-gold-glow'
                      : 'bg-arena-black border border-arena-border text-gray-300 hover:border-white/30'
                  }`}
                >
                  {seconds}s ({formatCountdown(seconds)})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Duração Personalizada (Segundos)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={3600}
                    step={1}
                    required
                    value={defaultDuration}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDefaultDuration(val);
                    }}
                    className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-arena-gold transition-colors pr-16"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500 font-bold">
                    segundos
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Permitido: 10s (mínimo) a 3600s (1 hora máximo).
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-arena-black border border-arena-border">
                <div>
                  <span className="block text-xs font-bold text-white mb-0.5">
                    Exibir Telão em Tempo Real
                  </span>
                  <span className="block text-[11px] text-gray-400">
                    Sincronização ao vivo do cronômetro e votos no Telão oficial.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={showRealtimeScreen}
                    onChange={(e) => setShowRealtimeScreen(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-arena-green"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Configuração do Peso do Voto Popular */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-arena-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-base font-black text-white">
              <Percent className="w-5 h-5 text-emerald-400" />
              <span>Peso do Voto Popular na Nota Oficial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                Peso: {popularWeight}%
              </span>
              <span className="text-xs font-mono font-bold text-arena-gold px-3 py-1 rounded-lg bg-arena-gold/10 border border-arena-gold/30">
                Máximo: {popularWeight.toFixed(1).replace('.', ',')} pts
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Define a representação do Voto Popular na nota final do evento (de 0% a 100%). A pontuação oficial do projeto é calculada como: <code className="text-arena-gold font-mono font-bold">(Média Geral / 5.0) × {popularWeight}%</code>.
          </p>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-1">
                Pesos comuns:
              </span>
              {[0, 10, 20, 30, 40, 50, 100].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setPopularWeight(w)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    popularWeight === w
                      ? 'bg-emerald-500 text-black shadow-green-glow font-black'
                      : 'bg-arena-black border border-arena-border text-gray-300 hover:border-white/30'
                  }`}
                >
                  {w}%
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Valor Numérico do Peso (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    required
                    value={popularWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPopularWeight(Math.max(0, Math.min(100, isNaN(val) ? 0 : val)));
                    }}
                    className="w-full bg-arena-black border border-arena-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400 transition-colors pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-emerald-400 font-black">
                    %
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Faixa permitida: 0.00% a 100.00%.
                </span>
              </div>

              {/* Slider interativo */}
              <div className="p-3.5 rounded-xl bg-arena-black border border-arena-border flex flex-col justify-center">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>0% (Simulação pura)</span>
                  <span className="text-white font-bold">{popularWeight}%</span>
                  <span>100% (Decisão exclusiva)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={popularWeight}
                  onChange={(e) => setPopularWeight(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Recálculo voluntário auditável */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-white block">Recálculo Explícito de Resultados</span>
                <span className="text-gray-400 block text-[11px]">
                  Deseja atualizar notas previamente consolidadas para este evento com o novo peso?
                </span>
              </div>
              <button
                type="button"
                onClick={handleRecalculateResults}
                disabled={isRecalculating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                <span>{isRecalculating ? 'Recalculando...' : 'Recalcular Resultados Agora'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Ordem Oficial de Apresentação dos Projetos */}
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

        {/* 5. Histórico e Versionamento de Alterações (Etapa 4) */}
        <div className="bg-arena-card border border-arena-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-arena-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-base font-black text-white">
              <History className="w-5 h-5 text-arena-blue" />
              <span>Histórico Auditável de Configurações</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {historyItems.length} registros
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Registro cronológico das alterações efetuadas nas configurações deste evento para fins de transparência e auditoria.
          </p>

          {historyItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs italic">
              Nenhuma alteração registrada até o momento para este evento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-arena-black text-gray-400 uppercase tracking-wider text-[11px] border-b border-arena-border">
                  <tr>
                    <th className="py-2.5 px-3">Data e Hora</th>
                    <th className="py-2.5 px-3">Parâmetro</th>
                    <th className="py-2.5 px-3">Valor Anterior</th>
                    <th className="py-2.5 px-3">Novo Valor</th>
                    <th className="py-2.5 px-3 text-right">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/40 text-gray-200">
                  {historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 font-mono text-[11px]">
                      <td className="py-2.5 px-3 text-gray-400">
                        {new Date(item.changedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-bold text-white">
                        {item.settingKey === 'default_round_duration'
                          ? 'Duração da Rodada'
                          : item.settingKey === 'popular_vote_weight'
                          ? 'Peso do Voto Popular'
                          : item.settingKey}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {item.oldValue || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-arena-gold font-bold">
                        {item.newValue}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">
                        {item.changedByName || (item.changedBy ? item.changedBy.substring(0, 8) + '...' : 'Admin')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Confirmação para Alteração Crítica de Peso */}
        {showWeightConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-arena-card border border-arena-gold/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-arena-gold">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-black text-white">Confirmar Alteração de Peso</h3>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Você está alterando o peso do Voto Popular de <strong className="text-white font-mono">{initialSettings?.popularVoteWeight}%</strong> para <strong className="text-emerald-400 font-mono">{popularWeight}%</strong>.
              </p>

              <div className="p-3 rounded-xl bg-arena-black border border-arena-border text-xs text-gray-300 space-y-1">
                <p className="font-bold text-white">Importante:</p>
                <p>• Esta alteração afetará as próximas rodadas e cálculos futuros.</p>
                <p>• Resultados já publicados não serão alterados automaticamente.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeightConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-arena-gold text-black hover:bg-amber-400 text-xs font-black shadow-gold-glow transition-all"
                >
                  {isSaving ? 'Salvando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Salvar Alterações */}
        <div className="pt-2 flex justify-end">
          <AdminActionButton
            type="submit"
            variant="gold"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
            className="w-full sm:w-auto px-8 py-3.5"
          >
            SALVAR CONFIGURAÇÕES DO EVENTO
          </AdminActionButton>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
