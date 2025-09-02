
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    signInWithEmailAndPassword, 
    signOut, 
    EmailAuthProvider, 
    reauthenticateWithCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// --- IMPORTANT ---
// To add a new user, you must add them through the Firebase Console Authentication page.
// The email should be the user's 10-digit PIN followed by @weightwise.app
// For example: `1234567890@weightwise.app`
// The password for ALL users will be the `SECRET_PASSWORD` defined below.
const AUTH_DOMAIN = "weightwise.app";
const SECRET_PASSWORD = "default-password-for-all-users"; // This is a shared secret, not a user-specific password.


interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  reauthenticate: (password?: string) => Promise<void>; // Password becomes optional
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A helper function to format the PIN into an email.
const formatPinToEmail = (pin: string) => {
    if (!/^\d{10}$/.test(pin)) {
        throw new Error("Invalid PIN format. It must be a 10-digit number.");
    }
    return `${pin}@${AUTH_DOMAIN}`;
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (pin: string) => {
    const email = formatPinToEmail(pin);
    // Use the hardcoded secret password for all logins
    await signInWithEmailAndPassword(auth, email, SECRET_PASSWORD);
  };
  
  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // Reauthentication will now use the same secret password
  const reauthenticate = async (password?: string) => {
    if (!user || !user.email) throw new Error("No user is signed in or user has no email.");
    // We ignore the provided password and use the secret one for re-authentication
    const credential = EmailAuthProvider.credential(user.email, SECRET_PASSWORD);
    await reauthenticateWithCredential(user, credential);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    reauthenticate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
