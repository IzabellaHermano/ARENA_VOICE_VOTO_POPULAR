import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const closeRound = onCall({ region: 'southamerica-east1' }, async (request) => {
  // 1. Validação de autenticação e permissão de administrador
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const token = request.auth.token;
  const isAdmin = token.admin === true || token.role === 'admin' || token.role === 'superadmin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem encerrar rodadas.');
  }

  const { eventId, roundId } = request.data || {};
  if (!eventId || !roundId) {
    throw new HttpsError('invalid-argument', 'eventId e roundId são obrigatórios.');
  }

  const db = admin.firestore();
  const roundRef = db.collection('rounds').doc(roundId);
  const roundDoc = await roundRef.get();

  if (!roundDoc.exists) {
    throw new HttpsError('not-found', 'Rodada não encontrada.');
  }

  const roundData = roundDoc.data();
  if (roundData?.eventId !== eventId) {
    throw new HttpsError('invalid-argument', 'A rodada não pertence a este evento.');
  }

  const batch = db.batch();

  // 2. Encerrar a rodada e registrar horário final do servidor para bloquear novos votos
  batch.update(roundRef, {
    status: 'closed',
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 3. Atualizar o estado global do evento
  const eventRef = db.collection('events').doc(eventId);
  batch.update(eventRef, {
    currentRoundId: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    roundId,
    status: 'closed',
    message: 'Rodada encerrada com sucesso. Novos votos estão impedidos.',
  };
});
