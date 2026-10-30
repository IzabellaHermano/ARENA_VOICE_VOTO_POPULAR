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
  if (!eventId) {
    throw new HttpsError('invalid-argument', 'eventId é obrigatório.');
  }

  const db = admin.firestore();

  // 1. Identificar o próximo projeto se não for informado
  let targetProjectId = nextProjectId;
  if (!targetProjectId) {
    const projectsSnapshot = await db
      .collection('projects')
      .where('eventId', '==', eventId)
      .where('active', '==', true)
      .orderBy('order', 'asc')
      .get();

    if (projectsSnapshot.empty) {
      throw new HttpsError('not-found', 'Nenhum projeto ativo cadastrado para este evento.');
    }

    const eventDoc = await db.collection('events').doc(eventId).get();
    const currentProjectId = eventDoc.data()?.currentProjectId;

    const projectsList = projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const currentIndex = projectsList.findIndex((p) => p.id === currentProjectId);
    const nextIndex = (currentIndex + 1) % projectsList.length;
    targetProjectId = projectsList[nextIndex].id;
  }

  // 2. Encerrar qualquer rodada ainda em aberto
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

  // 3. Criar a nova rodada com status 'waiting' (NÃO aberta automaticamente)
  const newRoundRef = db.collection('rounds').doc();
  batch.set(newRoundRef, {
    eventId,
    projectId: targetProjectId,
    status: 'waiting',
    startedAt: null,
    endedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 4. Atualizar o estado global do evento
  const eventRef = db.collection('events').doc(eventId);
  batch.update(eventRef, {
    currentProjectId: targetProjectId,
    currentRoundId: newRoundRef.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    roundId: newRoundRef.id,
    projectId: targetProjectId,
    status: 'waiting',
    message: 'Próximo projeto preparado em estado de espera. A votação aguarda liberação manual do operador.',
  };
});
