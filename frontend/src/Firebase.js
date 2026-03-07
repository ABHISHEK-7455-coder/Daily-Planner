// Firebase.js — replaces Supabase.js
// Install: npm install firebase

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
  signOut as firebaseSignOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Dev-time guard ────────────────────────────────────────────
if (import.meta.env.DEV) {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("your-")) {
    console.error(
      "%c⛔ Firebase env vars missing!\n" +
      "1. Go to console.firebase.google.com → your project → Project Settings\n" +
      "2. Scroll to 'Your apps' → Web app → Config\n" +
      "3. Add all VITE_FIREBASE_* keys to your .env file\n" +
      "4. Restart dev server: npm run dev",
      "color:red;font-weight:bold;font-size:13px"
    );
  }
}

const app              = initializeApp(firebaseConfig);
export const auth      = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ── Helper wrappers (mimic Supabase API shape) ────────────────
export const firebaseAuth = {
  signInWithPassword: async ({ email, password }) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { data: { user: result.user }, error: null };
    } catch (err) {
      return { data: null, error: { message: friendlyError(err.code) } };
    }
  },

  signUp: async ({ email, password, options }) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (options?.data?.full_name) {
        await updateProfile(result.user, { displayName: options.data.full_name });
      }
      return { data: { user: result.user }, error: null };
    } catch (err) {
      return { data: null, error: { message: friendlyError(err.code) } };
    }
  },

  resetPasswordForEmail: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err) {
      return { error: { message: friendlyError(err.code) } };
    }
  },

  signInWithOAuth: async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      return { error: null };
    } catch (err) {
      return { error: { message: friendlyError(err.code) } };
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    return { error: null };
  },

  getSession: () => {
    return new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged((user) => {
        unsub();
        resolve({ data: { session: user ? { user } : null } });
      });
    });
  },

  onAuthStateChange: (callback) => {
    const unsub = auth.onAuthStateChanged((user) => {
      const session = user ? { user } : null;
      callback(user ? "SIGNED_IN" : "SIGNED_OUT", session);
    });
    return { data: { subscription: { unsubscribe: unsub } } };
  },
};

// ── Firebase error code → human message ──────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "No account found with this email.",
    "auth/wrong-password":        "Incorrect password.",
    "auth/email-already-in-use":  "An account with this email already exists.",
    "auth/invalid-email":         "Please enter a valid email address.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/too-many-requests":     "Too many attempts. Please try again later.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/popup-closed-by-user":  "Google sign-in was cancelled.",
    "auth/invalid-credential":    "Invalid email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

export default app;