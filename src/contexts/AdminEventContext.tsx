import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventDocument } from '@/types';
import { EventService } from '@/services/eventService';

export interface AdminEventContextType {
  currentEventId: string | null;
  currentEvent: EventDocument | null;
  isLoadingEvent: boolean;
  selectEvent: (eventId: string) => void;
  clearSelectedEvent: () => void;
  refreshCurrentEvent: () => Promise<void>;
}

const STORAGE_KEY = 'arena_voice_admin_selected_event_id';

export const AdminEventContext = createContext<AdminEventContextType | undefined>(undefined);

export const AdminEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Inicializa o evento selecionado a partir do localStorage
  const [currentEventId, setCurrentEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || null;
    }
    return null;
  });

  const [currentEvent, setCurrentEvent] = useState<EventDocument | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState<boolean>(false);

  // Monitora o evento atual em tempo real via Supabase
  useEffect(() => {
    if (!currentEventId) {
      setCurrentEvent(null);
      setIsLoadingEvent(false);
      return;
    }

    setIsLoadingEvent(true);
    const unsub = EventService.subscribeToCurrentEvent(
      currentEventId,
      (eventDoc) => {
        setIsLoadingEvent(false);
        if (eventDoc) {
          setCurrentEvent(eventDoc);
        } else {
          // Se o evento não for encontrado no banco
          setCurrentEvent(null);
        }
      },
      (err) => {
        setIsLoadingEvent(false);
        console.warn('Erro ao carregar evento no contexto:', err.message);
      }
    );

    return () => unsub();
  }, [currentEventId]);

  // Ação: Entrar em um evento
  const selectEvent = useCallback((eventId: string) => {
    if (!eventId) return;
    setCurrentEventId(eventId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, eventId);
    }
  }, []);

  // Ação: Trocar de evento (retorna para Meus Eventos)
  const clearSelectedEvent = useCallback(() => {
    setCurrentEventId(null);
    setCurrentEvent(null);
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
