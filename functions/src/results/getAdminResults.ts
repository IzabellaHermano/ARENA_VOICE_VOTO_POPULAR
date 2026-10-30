import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const getAdminResults = onCall({ region: 'southamerica-east1' }, async (request) => {
  // 1. Verificação de permissões administrativas no servidor
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const token = request.auth.token;
  const isAdmin = token.admin === true || token.role === 'admin' || token.role === 'superadmin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem consultar relatórios completos.');
  }

  const { eventId } = request.data || {};
  if (!eventId) {
    throw new HttpsError('invalid-argument', 'eventId é obrigatório.');
  }

  const db = admin.firestore();

  // 2. Consulta dos resultados consolidados
  const resultsSnapshot = await db
    .collection('results')
    .where('eventId', '==', eventId)
    .orderBy('averageGeneral', 'desc')
    .get();

  // 3. Consulta dos projetos para mapear nomes e metadados
  const projectsSnapshot = await db
    .collection('projects')
    .where('eventId', '==', eventId)
    .get();

  const projectsMap = new Map<string, FirebaseFirestore.DocumentData>();
  projectsSnapshot.forEach((doc) => {
    projectsMap.set(doc.id, doc.data());
  });

  const results = resultsSnapshot.docs.map((doc) => {
    const data = doc.data();
    const project = projectsMap.get(data.projectId) || {};
    return {
      id: doc.id,
      ...data,
      projectName: project.name || 'Projeto Desconhecido',
      projectBanner: project.bannerUrl || '',
      projectOrder: project.order || 0,
    };
  });

  return {
    success: true,
    eventId,
    totalProjectsEvaluated: results.length,
    results,
  };
});
