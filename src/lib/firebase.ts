import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDR7gRGxRFzRCXP0SB8Z0tPxVNOiJPDGP0",
  authDomain: "algotradeai-846f4.firebaseapp.com",
  projectId: "algotradeai-846f4",
  storageBucket: "algotradeai-846f4.firebasestorage.app",
  messagingSenderId: "138844128783",
  appId: "1:138844128783:web:1a829e2143a87f149d857a",
  measurementId: "G-X7HWCDYYBQ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

export const DEFAULT_USER = 'main_terminal';

export interface AppState {
  tradeMode: 'DEMO' | 'REAL';
  balance: number;
  positions: any[];
  closedPositions: any[];
  bots: any[];
  transactions?: any[];
}

export const defaultState: AppState = {
  tradeMode: 'DEMO',
  balance: 10000,
  positions: [],
  closedPositions: [],
  bots: [],
  transactions: []
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
