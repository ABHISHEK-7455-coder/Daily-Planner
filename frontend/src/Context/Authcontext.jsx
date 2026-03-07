// Context/Authcontext.jsx — Firebase version (replaces Supabase version)
// Drop-in replacement: same useAuth() API your app already uses

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "../Firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase onAuthStateChanged is the equivalent of Supabase onAuthStateChange
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Shape the user object to match what your app already reads:
        //   user.email
        //   user.user_metadata.full_name
        //   user.user_metadata.avatar_url
        //   user.id   (was Supabase UUID, now Firebase UID)
        setUser({
          id:    firebaseUser.uid,
          email: firebaseUser.email,
          user_metadata: {
            full_name:  firebaseUser.displayName || "",
            avatar_url: firebaseUser.photoURL    || "",
          },
          // Keep the raw Firebase user accessible if needed
          _firebase: firebaseUser,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseAuth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}