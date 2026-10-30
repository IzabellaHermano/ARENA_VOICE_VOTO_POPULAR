import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const openRound = onCall({ region: 'southamerica-east1' }, async (request) => {
  // 1. Validação de autenticação e permissão de administrador
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const token = request.auth.token;
  const isAdmin = token.admin === true || token.role === 'admin' || token.role === 'superadmin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem abrir rodadas.');
  }

  const { eventId, projectId } = request.data || {};
  if (!eventId || !projectId) {
    throw new HttpsError('invalid-argument', 'eventId e projectId são obrigatórios.');
  }

  const db = admin.firestore();

  // 2. Encerrar qualquer rodada que esteja aberta anteriormente para este evento
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

  // 3. Criar nova rodada aberta
  const newRoundRef = db.collection('rounds').doc();
  batch.set(newRoundRef, {
    eventId,
    projectId,
    status: 'open',
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    endedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 4. Atualizar o documento do evento
  const eventRef = db.collection('events').doc(eventId);
  batch.update(eventRef, {
    currentRoundId: newRoundRef.id,
    currentProjectId: projectId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    roundId: newRoundRef.id,
    projectId,
    message: 'Rodada aberta com sucesso!',
  };
});
