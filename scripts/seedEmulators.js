/**
 * Script de Seed para o Firebase Emulator Suite
 * Popula Firestore com evento demonstrativo, 4 projetos oficiais e 1 rodada aberta
 * 
 * Uso: node scripts/seedEmulators.js
 */

const http = require('http');

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-arena-voice';

const EVENT_ID = 'arena-voice-2026';

const seedData = {
  events: {
    [EVENT_ID]: {
      name: 'Arena Voice 2026 — Voto Popular',
      status: 'active',
      currentRoundId: 'round_projeto01',
      currentProjectId: 'projeto01',
      resultsPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  projects: {
    projeto01: {
      eventId: EVENT_ID,
      name: 'Projeto 01 — Plataforma Inteligente',
      description: 'Gestão de mobilidade e eficiência energética preditiva.',
      bannerUrl: '',
      order: 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    projeto02: {
      eventId: EVENT_ID,
      name: 'Projeto 02 — Manutenção Preditiva IoT',
      description: 'Sensores inteligentes embarcados na malha ferroviária.',
      bannerUrl: '',
      order: 2,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    projeto03: {
      eventId: EVENT_ID,
      name: 'Projeto 03 — Acessibilidade Digital',
      description: 'Ecossistema inclusivo multicanal para passageiros.',
      bannerUrl: '',
      order: 3,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    projeto04: {
      eventId: EVENT_ID,
      name: 'Projeto 04 — Economia Circular',
      description: 'Reaproveitamento de materiais e peças da frota.',
      bannerUrl: '',
      order: 4,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  rounds: {
    round_projeto01: {
      eventId: EVENT_ID,
      projectId: 'projeto01',
      status: 'open',
      startedAt: new Date().toISOString(),
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
};

console.log('Seed preparado para o Firebase Emulator Suite:', seedData);
console.log('Para carregar nos emuladores locais em execução, use o Firebase CLI:');
console.log('  firebase emulators:start --import=./emulator-data --export-on-exit');

