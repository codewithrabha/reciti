import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createOrUpdateUserDoc, getUserDoc } from '@/lib/db';
import { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;       // Firebase auth user (has .isAnonymous, .uid, etc.)
  userDoc: User | null;            // Firestore user document (has civicPoints, tier, etc.)
  loading: boolean;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserDoc = async () => {
    if (!user) return;
    const doc = await getUserDoc(user.uid);
    setUserDoc(doc);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (!currentUser.isAnonymous) {
          // Ensure user doc exists for real accounts
          await createOrUpdateUserDoc(currentUser.uid, {
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
          });
          const doc = await getUserDoc(currentUser.uid);
          setUserDoc(doc);
        }
      } else {
        // Sign in anonymously for browsing-only users
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Anonymous sign in error:', error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
