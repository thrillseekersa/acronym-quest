import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAtx1wqUnFcsKghLe6A5Es3UZUY5faQ7sw",
  authDomain: "studygame-e5806.firebaseapp.com",
  projectId: "studygame-e5806",
  storageBucket: "studygame-e5806.firebasestorage.app",
  messagingSenderId: "864145963809",
  appId: "1:864145963809:web:89da0afcc93d591c605c60"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
