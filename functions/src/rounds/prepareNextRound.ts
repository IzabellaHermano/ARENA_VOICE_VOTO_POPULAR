import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const prepareNextRound = onCall({ region: 'southamerica-east1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const token = request.auth.token;
  const isAdmin = token.admin === true || token.role === 'admin' || token.role === 'superadmin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem preparar rodadas.');
  }

  const { eventId, nextProjectId } = request.data || {};
  if (!eventId || !nextProjectId) {
    throw new HttpsError('invalid-argument', 'eventId e nextProjectId são obrigatórios.');
  }

  const db = admin.firestore();

  // Fecha qualquer rodada aberta existente
  const openRoundsSnapshot = await db
    .collection('rounds')
    .where('eventId', '==', eventId)
    .where('status', '==', 'open')
    .get();

  const batch = db.batch();

  openRoundsSnapshot.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'closed',
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Cria a nova rodada com status 'waiting' (NÃO aberta automaticamente)
  const newRoundRef = db.collection('rounds').doc();
  batch.set(newRoundRef, {
    eventId,
    projectId: nextProjectId,
    status: 'waiting',
    startedAt: null,
    endedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Atualiza o evento
  const eventRef = db.collection('events').doc(eventId);
  batch.update(eventRef, {
    currentProjectId: nextProjectId,
    currentRoundId: newRoundRef.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    roundId: newRoundRef.id,
    nextProjectId,
    status: 'waiting',
    message: 'Próxima rodada preparada em estado de espera (aguardando liberação do apresentador).',
  };
});
