import * as admin from 'firebase-admin';

// Inicialização única do Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Exportação das 5 Cloud Functions oficiais da especificação da Etapa 4
export { openRound } from './rounds/openRound';
export { closeRound } from './rounds/closeRound';
export { prepareNextRound } from './rounds/prepareNextRound';
export { submitVote } from './voting/submitVote';
export { getAdminResults } from './results/getAdminResults';
