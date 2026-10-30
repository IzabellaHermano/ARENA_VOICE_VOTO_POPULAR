import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase/config';
import {
  EventDocument,
  ProjectDocument,
  RoundDocument,
  ResultDocument,
  generateDeterministicVoteId,
} from '@/types';

export const DEFAULT_EVENT_ID = 'arena-voice-2026';

export interface SubmitVotePayload {
  eventId: string;
  roundId: string;
  projectId: string;
  innovation: number;
  impact: number;
  development: number;
}

export const EventService = {
  /**
   * Monitora o evento principal em tempo real via Firestore onSnapshot
   */
  subscribeToCurrentEvent(
    eventId: string,
    onUpdate: (event: EventDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const eventRef = doc(db, 'events', eventId);
    return onSnapshot(
      eventRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ id: snapshot.id, ...(snapshot.data() as EventDocument) });
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('Erro ao escutar evento em tempo real:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Monitora a rodada ativa em tempo real via onSnapshot
   */
  subscribeToActiveRound(
    roundId: string,
    onUpdate: (round: RoundDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const roundRef = doc(db, 'rounds', roundId);
    return onSnapshot(
      roundRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ id: snapshot.id, ...(snapshot.data() as RoundDocument) });
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('Erro ao escutar rodada em tempo real:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Monitora um projeto específico em tempo real
   */
  subscribeToProject(
    projectId: string,
    onUpdate: (project: ProjectDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const projectRef = doc(db, 'projects', projectId);
    return onSnapshot(
      projectRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ id: snapshot.id, ...(snapshot.data() as ProjectDocument) });
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('Erro ao escutar projeto em tempo real:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Monitora a lista completa de projetos do evento em tempo real
   */
  subscribeToProjectsList(
    eventId: string,
    onUpdate: (projects: ProjectDocument[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const projectsQuery = query(
      collection(db, 'projects'),
      where('eventId', '==', eventId),
      orderBy('order', 'asc')
    );

    return onSnapshot(
      projectsQuery,
      (snapshot) => {
        const list: ProjectDocument[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as ProjectDocument) });
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Erro ao escutar lista de projetos:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Monitora os resultados consolidados de um projeto em tempo real
   */
  subscribeToProjectResult(
    eventId: string,
    projectId: string,
    onUpdate: (result: ResultDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const resultRef = doc(db, 'results', `${eventId}_${projectId}`);
    return onSnapshot(
      resultRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ id: snapshot.id, ...(snapshot.data() as ResultDocument) });
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('Erro ao escutar resultados em tempo real:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Verifica se o participante já registrou voto no projeto especificado
   */
  async checkUserVote(
    eventId: string,
    projectId: string,
    voterUid: string
  ): Promise<boolean> {
    const voteId = generateDeterministicVoteId(eventId, projectId, voterUid);
    const voteRef = doc(db, 'votes', voteId);
    try {
      const snap = await getDoc(voteRef);
      return snap.exists();
    } catch (err) {
      console.warn('Falha na consulta direta de voto:', err);
      return false;
    }
  },

  // ==========================================
  // CHAMADAS DE CLOUD FUNCTIONS OFICIAIS (RPC)
  // ==========================================

  /**
   * Abre uma rodada no servidor
   */
  async openRound(eventId: string, projectId: string) {
    const callOpen = httpsCallable<{ eventId: string; projectId: string }, { success: boolean; roundId: string }>(
      functions,
      'openRound'
    );
    const result = await callOpen({ eventId, projectId });
    return result.data;
  },

  /**
   * Encerra a rodada ativa no servidor
   */
  async closeRound(eventId: string, roundId: string) {
    const callClose = httpsCallable<{ eventId: string; roundId: string }, { success: boolean; roundId: string }>(
      functions,
      'closeRound'
    );
    const result = await callClose({ eventId, roundId });
    return result.data;
  },

  /**
   * Prepara o próximo projeto em estado de espera ('waiting')
   */
  async prepareNextRound(eventId: string, nextProjectId?: string) {
    const callPrepare = httpsCallable<
      { eventId: string; nextProjectId?: string },
      { success: boolean; roundId: string; projectId: string; status: string }
    >(functions, 'prepareNextRound');
    const result = await callPrepare({ eventId, nextProjectId });
    return result.data;
  },

  /**
   * Envia o voto oficial do público para a transação atômica do servidor
   */
  async submitVote(payload: SubmitVotePayload) {
    const callSubmit = httpsCallable<
      SubmitVotePayload,
      { success: boolean; voteId: string; projectId: string; message: string }
    >(functions, 'submitVote');
    const result = await callSubmit(payload);
    return result.data;
  },

  /**
   * Consulta os resultados de auditoria para o painel de controle
   */
  async getAdminResults(eventId: string) {
    const callResults = httpsCallable<
      { eventId: string },
      { success: boolean; totalProjectsEvaluated: number; results: Array<Record<string, unknown>> }
    >(functions, 'getAdminResults');
    const result = await callResults({ eventId });
    return result.data;
  },
};

export default EventService;

