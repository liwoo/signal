import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy singleton — only initialise once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

/** Resolves the analytics instance (browser-only, lazy). */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  if (typeof window === "undefined") return null;
  // Deduplicate concurrent init calls
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Firebase] Analytics not supported in this environment");
        }
        return null;
      }
      analyticsInstance = getAnalytics(app);
      if (process.env.NODE_ENV === "development") {
        console.log("[Firebase] Analytics initialized", analyticsInstance);
      }
      return analyticsInstance;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Firebase] Analytics init failed:", err);
      }
      return null;
    }
  })();
  return initPromise;
}

/** Eagerly initialize analytics — call once on app mount. */
export function initFirebaseAnalytics(): void {
  getFirebaseAnalytics();
}
