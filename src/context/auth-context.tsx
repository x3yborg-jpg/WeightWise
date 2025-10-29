
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
import { auth, firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// --- IMPORTANT ---
// To add a new user, you must add them through the Firebase Console Authentication page.
// The email should be the user's 10-digit PIN followed by @weightwise.app
// For example: `1234567890@weightwise.app`
// The password for ALL users will be the `SECRET_PASSWORD` defined below.
const AUTH_DOMAIN = "weightwise.app";
const SECRET_PASSWORD = "WeightWise"; // This is a shared secret, not a user-specific password.

export type UserRole = 'admin' | 'user';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Fetch user role from Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        const snapshot = await getDoc(userDocRef);
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setUserRole(userData.role || 'user');
          // Update last login time
          await setDoc(userDocRef, { 
            lastLoginAt: Timestamp.now() 
          }, { merge: true });
        } else {
          // Default to 'user' role if not set
          await setDoc(userDocRef, {
            email: user.email || '',
            role: 'user',
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
          });
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (pin: string) => {
    const email = formatPinToEmail(pin);
    await signInWithEmailAndPassword(auth, email, SECRET_PASSWORD);
  };
  
  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const reauthenticate = async () => {
    if (!user || !user.email) throw new Error("No user is signed in or user has no email.");
    const credential = EmailAuthProvider.credential(user.email, SECRET_PASSWORD);
    await reauthenticateWithCredential(user, credential);
  };

  const value = {
    user,
    userRole,
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
