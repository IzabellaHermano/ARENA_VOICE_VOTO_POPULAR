/**
 * ARENA VOICE — VOTO POPULAR
 * Módulo Oficial de Cálculo e Classificação de Resultados (Etapa 6)
 *
 * Regras Oficiais:
 * - Média Inovação = Soma das notas de inovação / Total de votos
 * - Média Impacto = Soma das notas de impacto / Total de votos
 * - Média Desenvolvimento = Soma das notas de desenvolvimento / Total de votos
 * - Média Geral = (Inovação + Impacto + Desenvolvimento) / 3
 * - Percentual = (Média Geral / 5) × 100
 * - Pontos do Voto Popular = (Média Geral / 5) × 20 (máximo 20 pontos)
 *
 * Diretrizes:
 * - Projetos sem votos aparecem estritamente como "Sem avaliações" (NUNCA 0 ou 0.0)
 * - Cálculos realizados com precisão completa de ponto flutuante
 * - Arredondamento de 1 casa decimal exclusivo para exibição
 * - Ordenação do ranking baseada na precisão completa
 * - Preservação estrita de empates reais
 */

import type { ProjectDocument, ResultDocument } from '../types';

export interface CriterionScoreItem {
  id: string;
  title: string;
  average: number | null;
  formatted: string;
}

export interface ProjectScoringResult {
  projectId: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  order: number;
  active: boolean;
  totalVotes: number;
  hasEvaluations: boolean;

  // Critérios dinâmicos por evento (Etapa 3)
  criteriaScores?: CriterionScoreItem[];

  // Configuração do Peso do Voto Popular (Etapa 4)
  popularVoteWeight?: number;

  // Valores brutos de ponto flutuante (precisão completa) ou null se sem votos
  rawInnovation: number | null;
  rawImpact: number | null;
  rawDevelopment: number | null;
  rawGeneral: number | null;
  rawPercentage: number | null;
  rawPoints: number | null;

  // Valores formatados para exibição (1 casa decimal: ex "4,3", "86,0%", "17,2" ou "Sem avaliações")
  formattedInnovation: string;
  formattedImpact: string;
  formattedDevelopment: string;
  formattedGeneral: string;
  formattedPercentage: string;
  formattedPoints: string;

  // Posição no ranking (1, 2, 3...) respeitando empates reais (ex: 1º, 1º, 3º...)
  rank: number | null;
  tie: boolean;
}

/**
 * Formata um número decimal com 1 casa decimal e vírgula no padrão brasileiro
 */
export function formatScore(value: number | null | undefined, fallback: string = 'Sem avaliações'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toFixed(1).replace('.', ',');
}

/**
 * Formata percentual com 1 casa decimal e símbolo %
 */
export function formatPercent(value: number | null | undefined, fallback: string = 'Sem avaliações'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * Calcula a pontuação oficial do projeto a partir do resultado consolidado e do peso do Voto Popular
 */
export function calculateProjectScore(
  project: { id?: string; name: string; description?: string; bannerUrl?: string; order?: number; active?: boolean },
  resultDoc?: Partial<ResultDocument> | null,
  eventPopularWeight: number = 20
): ProjectScoringResult {
  const projectId = project.id || '';
  const totalVotes = resultDoc?.totalVotes || 0;
  const effectivePopularWeight =
    resultDoc?.popularVoteWeight !== undefined && resultDoc.popularVoteWeight !== null
      ? Number(resultDoc.popularVoteWeight)
      : eventPopularWeight;

  // Caso 1: Projeto sem avaliações
  if (totalVotes === 0) {
    return {
      projectId,
      name: project.name,
      description: project.description,
      bannerUrl: project.bannerUrl,
      order: project.order ?? 1,
      active: project.active ?? true,
      totalVotes: 0,
      hasEvaluations: false,
      popularVoteWeight: effectivePopularWeight,
      rawInnovation: null,
      rawImpact: null,
      rawDevelopment: null,
      rawGeneral: null,
      rawPercentage: null,
      rawPoints: null,
      formattedInnovation: 'Sem avaliações',
      formattedImpact: 'Sem avaliações',
      formattedDevelopment: 'Sem avaliações',
      formattedGeneral: 'Sem avaliações',
      formattedPercentage: 'Sem avaliações',
      formattedPoints: 'Sem avaliações',
      rank: null,
      tie: false,
    };
  }

  // Caso 2: Projeto com avaliações registradas
  // Extrai ou reconstrói as somas para precisão completa
  const sumInnovation =
    resultDoc?.sumInnovation !== undefined
      ? resultDoc.sumInnovation
      : (resultDoc?.averageInnovation || 0) * totalVotes;

  const sumImpact =
    resultDoc?.sumImpact !== undefined
      ? resultDoc.sumImpact
      : (resultDoc?.averageImpact || 0) * totalVotes;

  const sumDevelopment =
    resultDoc?.sumDevelopment !== undefined
      ? resultDoc.sumDevelopment
      : (resultDoc?.averageDevelopment || 0) * totalVotes;

  // Médias individuais dos três critérios (pesos iguais)
  const rawInnovation = sumInnovation / totalVotes;
  const rawImpact = sumImpact / totalVotes;
  const rawDevelopment = sumDevelopment / totalVotes;

  // Critérios dinâmicos (se fornecidos pelo backend)
  let criteriaScores: CriterionScoreItem[] | undefined = undefined;
  if (resultDoc?.questionsMetrics && Array.isArray(resultDoc.questionsMetrics) && resultDoc.questionsMetrics.length > 0) {
    criteriaScores = resultDoc.questionsMetrics.map((qm: any) => ({
      id: qm.question_id || qm.id || '',
      title: qm.title || 'Critério',
      average: typeof qm.average_score === 'number' ? qm.average_score : null,
      formatted: formatScore(qm.average_score),
    }));
  }

  // Média Geral = soma de todas as notas válidas / quantidade total de respostas válidas
  const rawGeneral =
    resultDoc?.averageGeneral !== undefined && resultDoc.averageGeneral !== null
      ? resultDoc.averageGeneral
      : (rawInnovation + rawImpact + rawDevelopment) / 3;

  // Percentual = (Média Geral / 5) * 100
  const rawPercentage =
    resultDoc?.percentage !== undefined && resultDoc.percentage !== null
      ? resultDoc.percentage
      : (rawGeneral / 5) * 100;

  // Pontos do Voto Popular = (Média Geral / 5) * peso configurado (máximo popularWeight pontos)
  const rawPoints =
    resultDoc?.popularPoints !== undefined && resultDoc.popularPoints !== null
      ? resultDoc.popularPoints
      : (rawGeneral / 5) * effectivePopularWeight;

  return {
    projectId,
    name: project.name,
    description: project.description,
    bannerUrl: project.bannerUrl,
    order: project.order ?? 1,
    active: project.active ?? true,
    totalVotes,
    hasEvaluations: true,
    criteriaScores,
    popularVoteWeight: effectivePopularWeight,
    rawInnovation,
    rawImpact,
    rawDevelopment,
    rawGeneral,
    rawPercentage,
    rawPoints,
    formattedInnovation: formatScore(rawInnovation),
    formattedImpact: formatScore(rawImpact),
    formattedDevelopment: formatScore(rawDevelopment),
    formattedGeneral: formatScore(rawGeneral),
    formattedPercentage: formatPercent(rawPercentage),
    formattedPoints: formatScore(rawPoints),
    rank: null,
    tie: false,
  };
}

/**
 * Ordena os projetos pelo resultado geral em precisão completa e atribui ranks com respeito a empates reais
 */
export function rankProjects(items: ProjectScoringResult[]): ProjectScoringResult[] {
  // Separa projetos avaliados daqueles sem avaliações
  const evaluated = items.filter((p) => p.hasEvaluations && p.rawGeneral !== null);
  const unevaluated = items.filter((p) => !p.hasEvaluations || p.rawGeneral === null);

  // Ordena os avaliados por Média Geral decrescente (usando precisão completa float)
  evaluated.sort((a, b) => {
    if (b.rawGeneral! !== a.rawGeneral!) {
      return b.rawGeneral! - a.rawGeneral!;
    }
    // Desempate por Pontos / Total de votos se necessário
    return (b.totalVotes || 0) - (a.totalVotes || 0);
  });

  // Ordena os não avaliados pela ordem sequencial do evento
  unevaluated.sort((a, b) => a.order - b.order);

  // Atribui ranking com suporte a empates reais
  // Exemplo de empate real: se 1º e 2º têm 4.3333333, ambos recebem 1º lugar. O seguinte recebe 3º lugar.
  const rankedEvaluated: ProjectScoringResult[] = [];
  const EPSILON = 1e-9;

  for (let i = 0; i < evaluated.length; i++) {
    const current = { ...evaluated[i] };

    if (i === 0) {
      current.rank = 1;
      current.tie = false;
    } else {
      const prev = rankedEvaluated[i - 1];
      const isTied = Math.abs(current.rawGeneral! - prev.rawGeneral!) < EPSILON;

      if (isTied) {
        current.rank = prev.rank;
        current.tie = true;
        prev.tie = true;
      } else {
        // Posição correspondente ao índice ordinal clássico (1-based)
        current.rank = i + 1;
        current.tie = false;
      }
    }

    rankedEvaluated.push(current);
  }

  // Projetos sem avaliações não possuem rank numérico
  const formattedUnevaluated = unevaluated.map((p) => ({
    ...p,
    rank: null,
    tie: false,
  }));

  return [...rankedEvaluated, ...formattedUnevaluated];
}

/**
 * Consolida uma lista de projetos e seus respectivos documentos de resultado
 */
export function buildRankedResults(
  projects: (ProjectDocument | { id: string; name: string; description?: string; bannerUrl?: string; order?: number; active?: boolean })[],
  resultsMap: Map<string, Partial<ResultDocument>> | Record<string, Partial<ResultDocument>>,
  eventPopularWeight: number = 20
): ProjectScoringResult[] {
  const getDoc = (id: string): Partial<ResultDocument> | undefined => {
    if (resultsMap instanceof Map) {
      return resultsMap.get(id);
    }
    return resultsMap[id];
  };

  const calculated = projects.map((project) => {
    const resDoc = getDoc(project.id || '');
    return calculateProjectScore(project, resDoc, eventPopularWeight);
  });

  return rankProjects(calculated);
}
