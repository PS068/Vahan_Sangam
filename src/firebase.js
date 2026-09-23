import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAHXnqLiySlJGMSAtdMoMiJDMIXIGP6Y8Y",
  authDomain: "vahansangam.firebaseapp.com",
  projectId: "vahansangam",
  storageBucket: "vahansangam.firebasestorage.app",
  messagingSenderId: "584745096117",
  appId: "1:584745096117:web:92c82c48cdc66da52e7ffc",
  measurementId: "G-LNKBXLGD0F"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({ prompt: 'select_account' });

try {
  getAnalytics(app);
} catch (e) {
  // Analytics may not be available in all environments
}

export default app;