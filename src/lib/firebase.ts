import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, setLogLevel, doc, setDoc, getDoc } from 'firebase/firestore';
import type { AppState, BotLearning } from '@/types';

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

/**
 * Récupère l'ID utilisateur actif basé sur le portefeuille Web3 connecté ou le terminal par défaut
 */
export function getActiveUserId(): string {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const stored = localStorage.getItem('connected_web3_wallet');
    if (stored) {
      const parsed = JSON.parse(stored);
      const addr = parsed?.address;
      if (addr && typeof addr === 'string' && addr.length >= 10) {
        // Nettoyer les caractères spéciaux pour Firestore doc ID
        const clean = addr.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `user_${clean.slice(0, 32)}`;
      }
    }
  } catch {}
  return DEFAULT_USER;
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

// Recursively strips undefined values (converting to null or removing) to satisfy Firestore serialization requirements
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj;
}

// Save partial state to Firestore (with sanitization for undefined values and error catching)
export async function saveFullState(state: Partial<AppState>, targetUserId?: string) {
  try {
    const userId = targetUserId || getActiveUserId();
    const docRef = doc(db, 'erp', userId);
    
    // Deeply sanitize state to ensure no undefined fields exist in arrays or nested objects
    const cleanState = sanitizeForFirestore(state);
    
    if (!cleanState || Object.keys(cleanState).length === 0) return;
    
    await setDoc(docRef, cleanState, { merge: true });
  } catch (error) {
    // Silent fallback to local storage
  }
}

// Explicit atomic save for AI Bot Learnings (gains & losses) to Firestore
export async function saveBotLearnings(learnings: BotLearning[], targetUserId?: string) {
  try {
    const userId = targetUserId || getActiveUserId();
    const docRef = doc(db, 'erp', userId);
    const cleanLearnings = sanitizeForFirestore(learnings);
    await setDoc(docRef, { botLearnings: cleanLearnings }, { merge: true });
  } catch (error) {
    // Silent fallback
  }
}

// Fetch state once
export async function getFullState(targetUserId?: string): Promise<AppState> {
  try {
    const userId = targetUserId || getActiveUserId();
    const docRef = doc(db, 'erp', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...defaultState, ...snap.data() } as AppState;
    }
  } catch (error) {
    console.warn("Firebase getDoc failed, using default state:", error);
  }
  return defaultState;
}

export type { AppState };
