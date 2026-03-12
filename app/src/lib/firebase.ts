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

const hasConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.measurementId);

// Lazy singleton — only initialise once
const app = hasConfig && getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0] ?? null;

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

/** Resolves the analytics instance (browser-only, lazy). */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  if (typeof window === "undefined") return null;
  if (!hasConfig || !app) {
    console.warn("[Firebase] Missing config — check NEXT_PUBLIC_FIREBASE_* env vars",
      { apiKey: !!firebaseConfig.apiKey, projectId: !!firebaseConfig.projectId, appId: !!firebaseConfig.appId, measurementId: !!firebaseConfig.measurementId });
    return null;
  }
  // Deduplicate concurrent init calls
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn("[Firebase] Analytics not supported in this environment");
        return null;
      }
      analyticsInstance = getAnalytics(app);
      console.log("[Firebase] Analytics initialized ✓", { measurementId: firebaseConfig.measurementId });
      return analyticsInstance;
    } catch (err) {
      console.error("[Firebase] Analytics init failed:", err);
      return null;
    }
  })();
  return initPromise;
}

/** Eagerly initialize analytics — call once on app mount. */
export function initFirebaseAnalytics(): void {
  getFirebaseAnalytics();
}
