import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, setLogLevel, doc, setDoc, getDoc } from 'firebase/firestore';
// firebase/auth not used in this project (anonymous auth disabled)

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDR7gRGxRFzRCXP0SB8Z0tPxVNOiJPDGP0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "algotradeai-846f4.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "algotradeai-846f4",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "algotradeai-846f4.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "138844128783",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:138844128783:web:1a829e2143a87f149d857a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X7HWCDYYBQ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Set Firestore log level to silent so offline fallback logs do not trigger Next.js console.error dev overlay
setLogLevel('silent');

// Use long-polling instead of WebChannel (which registers window.addEventListener('unload')
// triggering Permissions Policy violations in modern Chrome).
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const DEFAULT_USER = 'main_terminal';

export interface AppState {
  tradeMode: 'DEMO' | 'REAL';
  balance: number;
  reserveVault?: number;
  reserveVaultSol?: number;
  positions: Record<string, unknown>[];
  closedPositions: Record<string, unknown>[];
  bots: Record<string, unknown>[];
  transactions?: Record<string, unknown>[];
  botLearnings?: Record<string, unknown>[];
  botLogs?: Record<string, unknown>[];
  cexKeys?: Record<string, unknown> | null;
  notificationSettings?: Record<string, unknown> | null;
}

export const defaultState: AppState = {
  tradeMode: 'DEMO',
  balance: 10000,
  reserveVault: 0,
  reserveVaultSol: 0,
  positions: [],
  closedPositions: [],
  bots: [],
  transactions: [],
  botLearnings: [],
  botLogs: [],
  cexKeys: null,
  notificationSettings: null
};

// Save partial state to Firestore (with sanitization for undefined values and error catching)
export async function saveFullState(state: Partial<AppState>) {
  try {
    const docRef = doc(db, 'erp', DEFAULT_USER);
    
    // Sanitize state to remove undefined values
    const cleanState = Object.fromEntries(
      Object.entries(state).filter(([_, v]) => v !== undefined)
    );
    
    if (Object.keys(cleanState).length === 0) return;
    
    await setDoc(docRef, cleanState, { merge: true });
  } catch (error) {
    console.warn("Firebase setDoc failed, falling back to local storage:", error);
  }
}

// Fetch state once
export async function getFullState(): Promise<AppState> {
  try {
    const docRef = doc(db, 'erp', DEFAULT_USER);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...defaultState, ...snap.data() } as AppState;
    }
  } catch (error) {
    console.warn("Firebase getDoc failed, using default state:", error);
  }
  return defaultState;
}
