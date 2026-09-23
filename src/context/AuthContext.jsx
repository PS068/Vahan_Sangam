import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);   // Firebase Google/Email/Demo user
  const [userProfile, setUserProfile] = useState(null);   // Firestore profile (role, phone, address, etc.)
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false); // true if needs role, phone, or garage profile

  // Check for local demo user on mount
  useEffect(() => {
    const savedDemo = localStorage.getItem('vahansangam_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setCurrentUser(parsed.user);
        setUserProfile(parsed.profile);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('vahansangam_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        await loadUserProfile(firebaseUser);
      } else {
        // If not in demo mode
        if (!localStorage.getItem('vahansangam_demo_user')) {
          setCurrentUser(null);
          setUserProfile(null);
          setNeedsOnboarding(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load Firestore profile for user
  const loadUserProfile = async (firebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        if (firebaseUser.photoURL && data.photoURL !== firebaseUser.photoURL) {
          data.photoURL = firebaseUser.photoURL;
          await setDoc(userRef, { photoURL: firebaseUser.photoURL }, { merge: true });
        }
        setUserProfile(data);

        // Check if garage owner needs garage registration
        if (data.role === 'garage_owner') {
          const garageRef = doc(db, 'garages', firebaseUser.uid);
          const garageSnap = await getDoc(garageRef);
          if (!garageSnap.exists()) {
            setNeedsOnboarding(true);
            return;
          }
        }
        setNeedsOnboarding(false);
      } else {
        setUserProfile(null);
        setNeedsOnboarding(true);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setNeedsOnboarding(true);
    }
  };

  // Sign in with Email & Password
  const signInWithEmail = async (email, password) => {
    try {
      localStorage.removeItem('vahansangam_demo_user');
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      return result.user;
    } catch (err) {
      console.error('Email sign-in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials or create a new account.');
      }
      if (err.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(err.message || 'Login failed. Please try again.');
    }
  };

  // Sign up with Email & Password
  const signUpWithEmail = async (email, password, { name, phone, address, role = 'user' }) => {
    try {
      localStorage.removeItem('vahansangam_demo_user');
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;

      try {
        await updateProfile(user, { displayName: name });
      } catch (e) {
        console.warn('Profile name update warning:', e);
      }

      const profileData = {
        uid: user.uid,
        name: name.trim(),
        email: user.email,
        phone: phone.trim(),
        address: address ? address.trim() : '',
        role,
        emailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      setUserProfile(profileData);

      if (role === 'garage_owner') {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }

      return user;
    } catch (err) {
      console.error('Sign-up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.');
      }
      throw new Error(err.message || 'Registration failed. Please try again.');
    }
  };

  // Instant 1-Click Quick Demo Mode (Customer or Garage Owner)
  const loginAsDemoUser = async (demoRole = 'user') => {
    const isOwner = demoRole === 'garage_owner';
    const mockUid = isOwner ? 'demo-garage-owner-99' : 'demo-customer-88';
    const mockUser = {
      uid: mockUid,
      displayName: isOwner ? 'Rajesh Kumar (Garage Owner)' : 'Nikhil Sharma (Customer)',
      email: isOwner ? 'rajesh.apexmotors@example.com' : 'nikhil.customer@example.com',
      photoURL: null,
      emailVerified: true
    };
    const mockProfile = {
      uid: mockUid,
      name: mockUser.displayName,
      email: mockUser.email,
      phone: '+91 9876543210',
      address: isOwner ? 'Plot 42, Industrial Area, Mumbai' : 'Apt 402, Sea Crest Towers, Bandra West, Mumbai',
      role: demoRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('vahansangam_demo_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
    setCurrentUser(mockUser);
    setUserProfile(mockProfile);
    setNeedsOnboarding(false);

    try {
      await setDoc(doc(db, 'users', mockUid), mockProfile, { merge: true });
    } catch (e) {
      console.warn('Demo Firestore sync notice:', e);
    }

    return mockUser;
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      localStorage.removeItem('vahansangam_demo_user');
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.');
      }
      if (err.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site.');
      }
      if (err.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'your-domain';
        throw new Error(`Domain "${domain}" is not authorized in Firebase Console. Add it in Firebase Console -> Authentication -> Settings -> Authorized domains, or use 1-Click Demo Login.`);
      }
      throw new Error(err.message || 'Google sign-in failed. Please try again.');
    }
  };

  // Complete onboarding: save role + verified google details + phone & address to Firestore
  const completeOnboarding = async (role, extraData = {}) => {
    if (!currentUser) throw new Error('Not authenticated with Google');

    const profileData = {
      uid: currentUser.uid,
      name: extraData.name || currentUser.displayName || 'User',
      email: currentUser.email,
      phone: extraData.phone || userProfile?.phone || '',
      address: extraData.address || userProfile?.address || '',
      photoURL: currentUser.photoURL || null,
      role, // 'user' or 'garage_owner'
      emailVerified: true, // Google accounts have verified email
      createdAt: userProfile?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', currentUser.uid), profileData, { merge: true });
    setUserProfile(profileData);

    if (role === 'garage_owner') {
      setNeedsOnboarding(true); // needs to complete garage registration form
    } else {
      setNeedsOnboarding(false);
    }

    return profileData;
  };

  // Update user profile data (from MyAccount page)
  const updateUserProfileData = async (updatedFields) => {
    if (!currentUser) throw new Error('Not authenticated');

    const userRef = doc(db, 'users', currentUser.uid);
    const dataToSave = {
      ...updatedFields,
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, dataToSave, { merge: true });
    setUserProfile((prev) => ({ ...prev, ...dataToSave }));
    return true;
  };

  // Mark onboarding done (after garage registration)
  const finishOnboarding = () => setNeedsOnboarding(false);

  // Sign out
  const logout = async () => {
    try {
      localStorage.removeItem('vahansangam_demo_user');
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setNeedsOnboarding(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Helpers
  const isAuthenticated = !!currentUser;
  const role = userProfile?.role || null;
  const isGarageOwner = role === 'garage_owner';
  const isUser = role === 'user';

  const hasRole = (allowedRoles = []) => {
    if (!role) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAuthenticated,
        needsOnboarding,
        role,
        isGarageOwner,
        isUser,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        loginAsDemoUser,
        completeOnboarding,
        finishOnboarding,
        loadUserProfile,
        updateUserProfileData,
        logout,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

