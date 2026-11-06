import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const submitVote = onCall({ region: 'southamerica-east1' }, async (request) => {
  // 1. Validação de autenticação obrigatória (inclui autenticação anônima do público)
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Você precisa estar autenticado para registrar seu voto.'
    );
  }

  // 2. Validação opcional de App Check quando ativado no ambiente
  if (process.env.ENFORCE_APP_CHECK === 'true' && !request.app) {
    throw new HttpsError(
      'failed-precondition',
      'A validação de integridade do aplicativo (App Check) falhou.'
    );
  }

  const voterUid = request.auth.uid;
  const { eventId, roundId, projectId, innovation, impact, development } = request.data || {};

  // 3. Validação de parâmetros obrigatórios
  if (!eventId || !roundId || !projectId) {
    throw new HttpsError(
      'invalid-argument',
      'eventId, roundId e projectId são campos obrigatórios.'
    );
  }

  const numInnovation = Number(innovation);
  const numImpact = Number(impact);
  const numDevelopment = Number(development);

  if (
    !Number.isInteger(numInnovation) || numInnovation < 1 || numInnovation > 5 ||
    !Number.isInteger(numImpact) || numImpact < 1 || numImpact > 5 ||
    !Number.isInteger(numDevelopment) || numDevelopment < 1 || numDevelopment > 5
  ) {
    throw new HttpsError(
      'invalid-argument',
      'As notas de inovação, impacto e salto de desenvolvimento devem ser inteiros de 1 a 5.'
    );
  }

  // Chave determinística obrigatória: `${eventId}_${projectId}_${voterUid}`
  const voteDocId = `${eventId}_${projectId}_${voterUid}`;
  const resultDocId = `${eventId}_${projectId}`;

  const db = admin.firestore();

  // 4. Transação atômica para garantir voto único e cálculo consolidado consistente
  await db.runTransaction(async (transaction) => {
    const voteRef = db.collection('votes').doc(voteDocId);
    const existingVote = await transaction.get(voteRef);

    if (existingVote.exists) {
      throw new HttpsError(
        'already-exists',
        'Você já avaliou este projeto neste evento. Cada participante possui direito a voto único.'
      );
    }

    const roundRef = db.collection('rounds').doc(roundId);
    const roundDoc = await transaction.get(roundRef);

    if (!roundDoc.exists) {
      throw new HttpsError(
        'not-found',
        'A rodada indicada não foi encontrada.'
      );
    }

    if (roundDoc.data()?.status !== 'open') {
      throw new HttpsError(
        'failed-precondition',
        'A rodada de avaliação para este projeto já foi encerrada.'
      );
    }

    if (roundDoc.data()?.projectId !== projectId) {
      throw new HttpsError(
        'invalid-argument',
        'A rodada indicada não corresponde ao projeto em avaliação.'
      );
    }

    // Registrar o voto individual com timestamp do servidor
    transaction.set(voteRef, {
      eventId,
      roundId,
      projectId,
      voterUid,
      innovation: numInnovation,
      impact: numImpact,
      development: numDevelopment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Atualizar resultados agregados
    const resultRef = db.collection('results').doc(resultDocId);
    const resultDoc = await transaction.get(resultRef);

    let totalVotes = 1;
    let sumInnovation = numInnovation;
    let sumImpact = numImpact;
    let sumDevelopment = numDevelopment;

    if (resultDoc.exists) {
      const prevData = resultDoc.data()!;
      totalVotes = (prevData.totalVotes || 0) + 1;
      sumInnovation = (prevData.sumInnovation || 0) + numInnovation;
      sumImpact = (prevData.sumImpact || 0) + numImpact;
      sumDevelopment = (prevData.sumDevelopment || 0) + numDevelopment;
    }

    const averageInnovation = sumInnovation / totalVotes;
    const averageImpact = sumImpact / totalVotes;
    const averageDevelopment = sumDevelopment / totalVotes;
    const averageGeneral = (averageInnovation + averageImpact + averageDevelopment) / 3;
    const percentage = (averageGeneral / 5) * 100;
    const popularPoints = (averageGeneral / 5) * 20;

    transaction.set(
      resultRef,
      {
        eventId,
        projectId,
        totalVotes,
        sumInnovation,
        sumImpact,
        sumDevelopment,
        averageInnovation,
        averageImpact,
        averageDevelopment,
        averageGeneral,
        percentage,
        popularPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return {
    success: true,
    voteId: voteDocId,
    projectId,
    message: 'Voto confirmado e registrado no servidor com sucesso!',
  };
});
