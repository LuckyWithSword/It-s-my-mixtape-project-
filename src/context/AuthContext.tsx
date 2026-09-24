import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Sync user profile in Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile document
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Music Lover',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        // Update existing user profile
        const updates: Partial<UserProfile> = {
          displayName: firebaseUser.displayName || userSnap.data()?.displayName || 'Music Lover',
          email: firebaseUser.email || userSnap.data()?.email || '',
          photoURL: firebaseUser.photoURL || userSnap.data()?.photoURL || '',
          updatedAt: serverTimestamp(),
        };
        await updateDoc(userRef, updates);
        setUserProfile({
          uid: firebaseUser.uid,
          ...userSnap.data(),
          ...updates,
        } as UserProfile);
      }
    } catch (err: any) {
      console.warn('Could not sync user profile in Firestore:', err);
      // Fallback local representation so UX is never blocked
      setUserProfile({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      });
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await syncUserProfile(currentUser);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firebase Auth state error:', error);
        setAuthError('Authentication session error. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User | null> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
        return result.user;
      }
      return null;
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
      let friendlyMessage = 'Something went wrong while signing you in. Please try again.';

      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        friendlyMessage = 'Google sign-in was cancelled.';
      } else if (error?.code === 'auth/popup-blocked') {
        friendlyMessage = 'Pop-up was blocked by your browser. Please allow popups for this site and try again.';
      } else if (error?.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error?.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'This domain is not authorized in Firebase Authentication. Please add it to Authorized Domains in Firebase Console.';
      } else if (error?.code === 'auth/configuration-not-found') {
        friendlyMessage = 'Firebase Authentication configuration was not found. Please ensure the Google sign-in provider is enabled in Firebase Console.';
      }

      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setAuthError('Failed to sign out. Please try again.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
