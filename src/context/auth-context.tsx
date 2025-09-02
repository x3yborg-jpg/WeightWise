
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    signInWithEmailAndPassword, 
    signOut, 
    EmailAuthProvider, 
    reauthenticateWithCredential,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// --- IMPORTANT ---
// To add a new user, you must add them through the Firebase Console Authentication page.
// The email should be in the format: `+<countrycode><phonenumber>@weightwise.app`
// For example: `+11234567890@weightwise.app`
const AUTH_DOMAIN = "weightwise.app";


interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (mobileNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A helper function to format the phone number into an email.
// It removes all non-digit characters except for the leading '+'
const formatPhoneNumberToEmail = (phoneNumber: string) => {
    const cleanedNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!cleanedNumber.startsWith('+')) {
        // This is a basic fallback. Consider more robust validation.
        throw new Error("Invalid phone number format. It must include the country code starting with '+'.");
    }
    return `${cleanedNumber}@${AUTH_DOMAIN}`;
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

  const login = async (mobileNumber: string, password: string) => {
    const email = formatPhoneNumberToEmail(mobileNumber);
    await signInWithEmailAndPassword(auth, email, password);
  };
  
  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error("No user is signed in or user has no email.");
    const credential = EmailAuthProvider.credential(user.email, password);
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
