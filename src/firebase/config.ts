import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'arena-voice-voto-popular.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-arena-voice',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-arena-voice.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef',
};

// Inicialização do Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Serviços Oficiais do Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'southamerica-east1'); // Região recomendada São Paulo ou us-central1

// Garante persistência da sessão no navegador (LocalStorage)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Não foi possível definir persistência local no navegador:', err);
});

// Configuração opcional de App Check (quando chave fornecida)
if (typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_APPCHECK_KEY) {
  try {
    // Em desenvolvimento local pode utilizar debug token
    if (import.meta.env.DEV) {
      // @ts-expect-error self.FIREBASE_APPCHECK_DEBUG_TOKEN suportado pelo SDK
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APPCHECK_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.info('Firebase App Check inicializado com sucesso.');
  } catch (err) {
    console.warn('App Check não pôde ser inicializado:', err);
  }
}

// Conexão aos Emuladores se configurado no ambiente
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
    connectFunctionsEmulator(functions, host, 5001);
    console.info(`Conectado ao Firebase Emulator Suite em ${host}`);
  } catch (err) {
    console.warn('Emuladores já conectados ou indisponíveis:', err);
  }
}
