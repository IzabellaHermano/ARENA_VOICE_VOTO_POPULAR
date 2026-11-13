import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventDocument } from '@/types';
import { EventService } from '@/services/eventService';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export interface AdminEventContextType {
  currentEventId: string | null;
  currentEvent: EventDocument | null;
  isLoadingEvent: boolean;
  authorizationError: string | null;
  clearAuthorizationError: () => void;
  selectEvent: (eventId: string) => Promise<boolean>;
  clearSelectedEvent: () => void;
  refreshCurrentEvent: () => Promise<void>;
}

const STORAGE_KEY = 'arena_voice_admin_selected_event_id';

export const AdminEventContext = createContext<AdminEventContextType | undefined>(undefined);

export const AdminEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { adminUser, role, isAuthenticated } = useAdminAuth();

  // Inicializa o evento selecionado a partir do localStorage
  const [currentEventId, setCurrentEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || null;
    }
    return null;
  });

  const [currentEvent, setCurrentEvent] = useState<EventDocument | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState<boolean>(false);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);

  const clearAuthorizationError = useCallback(() => {
    setAuthorizationError(null);
  }, []);

  // Monitora e valida autorização do evento atual em tempo real via Supabase
  useEffect(() => {
    if (!currentEventId) {
      setCurrentEvent(null);
      setIsLoadingEvent(false);
      return;
    }

    if (!isAuthenticated || !adminUser?.uid) {
      return;
    }

    let isCancelled = false;
    setIsLoadingEvent(true);

    const validateAndSubscribe = async () => {
      // 1. Validação estrita no Supabase: o usuário possui acesso a este evento?
      const hasAccess = await EventService.hasUserEventAccess(
        currentEventId,
        adminUser.uid,
        role || undefined
      );

      if (isCancelled) return;

      if (!hasAccess) {
        // Acesso revogado ou inexistente!
        console.warn(`[AdminEventContext] Acesso revogado ao evento ${currentEventId} para ${adminUser.email}`);
        setCurrentEventId(null);
        setCurrentEvent(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        setIsLoadingEvent(false);
        setAuthorizationError('Acesso revogado: Você não possui autorização para gerenciar este evento.');
        navigate('/admin/eventos', { replace: true });
        return;
      }

      // 2. Escuta o evento em tempo real
      const unsub = EventService.subscribeToCurrentEvent(
        currentEventId,
        (eventDoc) => {
          if (isCancelled) return;
          setIsLoadingEvent(false);
          if (eventDoc) {
            setCurrentEvent(eventDoc);
          } else {
            setCurrentEvent(null);
          }
        },
        (err) => {
          if (isCancelled) return;
          setIsLoadingEvent(false);
          console.warn('Erro ao carregar evento no contexto:', err.message);
        }
      );

      return unsub;
    };

    let cleanupPromise = validateAndSubscribe();

    return () => {
      isCancelled = true;
      cleanupPromise.then((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [currentEventId, isAuthenticated, adminUser?.uid, role, navigate]);

  // Ação: Entrar em um evento com validação prévia de permissão
  const selectEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!eventId) return false;

      setAuthorizationError(null);

      if (adminUser?.uid) {
        const hasAccess = await EventService.hasUserEventAccess(
          eventId,
          adminUser.uid,
          role || undefined
        );

        if (!hasAccess) {
          setAuthorizationError('Acesso negado: Você não possui permissão para acessar este evento.');
          return false;
        }
      }

      setCurrentEventId(eventId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, eventId);
      }
      return true;
    },
    [adminUser?.uid, role]
  );

  // Ação: Trocar de evento (retorna para Meus Eventos)
  const clearSelectedEvent = useCallback(() => {
    setCurrentEventId(null);
    setCurrentEvent(null);
    setAuthorizationError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    navigate('/admin/eventos');
  }, [navigate]);

  // Atualização manual do evento
  const refreshCurrentEvent = useCallback(async () => {
    if (!currentEventId) return;
    try {
      const doc = await EventService.getEventById(currentEventId);
      if (doc) setCurrentEvent(doc);
    } catch (err) {
      console.warn('Erro ao atualizar dados do evento:', err);
    }
  }, [currentEventId]);

  return (
    <AdminEventContext.Provider
      value={{
        currentEventId,
        currentEvent,
        isLoadingEvent,
        authorizationError,
        clearAuthorizationError,
        selectEvent,
        clearSelectedEvent,
        refreshCurrentEvent,
      }}
    >
      {children}
    </AdminEventContext.Provider>
  );
};

export const useAdminEvent = (): AdminEventContextType => {
  const context = useContext(AdminEventContext);
  if (!context) {
    throw new Error('useAdminEvent deve ser utilizado dentro de um AdminEventProvider');
  }
  return context;
};

export default AdminEventContext;
