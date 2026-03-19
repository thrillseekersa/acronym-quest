import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';

// NOTE: Please replace these placeholder values with your actual actual Firebase Console keys for the 'Studygame' project.
const firebaseConfig = {
  apiKey: "AIzaSyAtx1wqUnFcsKghLe6A5Es3UZUY5faQ7sw",
  authDomain: "studygame-e5806.firebaseapp.com",
  projectId: "studygame-e5806",
  storageBucket: "studygame-e5806.firebasestorage.app",
  messagingSenderId: "864145963809",
  appId: "1:864145963809:web:89da0afcc93d591c605c60"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with Capacitor compatibility handling 
// (Capacitor works best with indexedDBLocalPersistence for auth to avoid boot crashes or state loss)
let auth;
if (Capacitor.isNativePlatform()) {
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence
  });
} else {
  auth = getAuth(app);
}

// Initialize Firestore (Database)
const firestore = getFirestore(app);

// Initialize Storage (Document Repository)
const storage = getStorage(app);

export { app, auth, firestore, storage };
