import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const openRound = onCall({ region: 'southamerica-east1' }, async (request) => {
  // 1. Validação de autenticação e permissão administrativa
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

  // 2. Validar se o projeto existe e pertence ao evento
  const projectRef = db.collection('projects').doc(projectId);
  const projectDoc = await projectRef.get();
  if (!projectDoc.exists) {
    throw new HttpsError('not-found', 'Projeto não encontrado para avaliação.');
  }
  const projectData = projectDoc.data();
  if (projectData?.eventId !== eventId || projectData?.active === false) {
    throw new HttpsError('failed-precondition', 'Projeto inativo ou pertencente a outro evento.');
  }

  // 3. Encerrar qualquer rodada anteriormente aberta para o evento
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

  // 4. Criar a nova rodada aberta com horário de início oficial do servidor
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

  // 5. Atualizar o estado global do evento de forma atômica
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
    status: 'open',
    message: 'Rodada aberta com sucesso!',
  };
});
