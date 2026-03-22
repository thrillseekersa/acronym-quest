import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import StarryLoading from '../components/StarryLoading';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);  // { uid, username }
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function updateUserFields(fields) {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, fields);
    setUserData(prev => ({ ...prev, ...fields }));
  }

  // Seed admin account if it doesn't exist
  async function ensureAdmin() {
    const adminRef = doc(db, 'users', 'admin_sayuri');
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        fullName: 'Sayuri',
        school: 'Admin',
        grade: 'Admin',
        username: 'Sayuri',
        password: 'Muffin',
        studyGroup: 'Gamified',
        points: 0,
        badges: [],
        quizzesTaken: 0,
        isAdmin: true,
        unlockedAvatars: ['🦊', '🦉', '🦄', '🐉', '🦁', '🐧', '👩‍🎓', '👨‍🎓'],
        createdAt: new Date().toISOString()
      });
      console.log('✅ Admin account seeded');
    }
  }

  async function register(fullName, school, grade, username, password, avatar = '🦊') {
    // Check if username is taken
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error('USERNAME_TAKEN');

    // Block registering as Sayuri (already pre-registered)
    if (username.toLowerCase() === 'sayuri') throw new Error('USERNAME_TAKEN');

    const uid = 'user_' + username.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

    // Balanced group assignment — assign to the smaller group
    const allUsers = await getDocs(collection(db, 'users'));
    let manualCount = 0, gamifiedCount = 0;
    allUsers.docs.forEach(d => {
      const g = d.data().studyGroup;
      if (g === 'Manual') manualCount++;
      else if (g === 'Gamified') gamifiedCount++;
    });
    const studyGroup = manualCount <= gamifiedCount ? 'Manual' : 'Gamified';

    const userDoc = {
      fullName, school, grade, username, password, avatar,
      unlockedAvatars: ['🦊', '🦉', '🦄', '🐉', '🦁', '🐧', '👩‍🎓', '👨‍🎓'],
      studyGroup, points: 0, badges: [], quizzesTaken: 0,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', uid), userDoc);

    setCurrentUser({ uid, username });
    setUserData(userDoc);
    localStorage.setItem('aq_user', JSON.stringify({ uid, username }));
    return userDoc;
  }

  async function login(username, password) {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snap = await getDocs(q);

    if (snap.empty) throw new Error('USER_NOT_FOUND');

    const userDocSnap = snap.docs[0];
    const data = userDocSnap.data();

    // Ensure older accounts get basic free avatars if missing
    if (!data.unlockedAvatars) {
       data.unlockedAvatars = ['🦊', '🦉', '🦄', '🐉', '🦁', '🐧', '👩‍🎓', '👨‍🎓'];
       await updateDoc(userDocSnap.ref, { unlockedAvatars: data.unlockedAvatars });
    }

    if (data.password !== password) throw new Error('WRONG_PASSWORD');
    if (data.banned) throw new Error('BANNED');

    setCurrentUser({ uid: userDocSnap.id, username: data.username });
    setUserData(data);
    localStorage.setItem('aq_user', JSON.stringify({ uid: userDocSnap.id, username: data.username }));
    return data;
  }

  async function logout() {
    setCurrentUser(null);
    setUserData(null);
    localStorage.removeItem('aq_user');
  }

  function isAdmin() {
    return userData?.username === 'Sayuri';
  }

  // Restore session on page load
  useEffect(() => {
    async function init() {
      const startTime = Date.now();
      await ensureAdmin();

      const saved = localStorage.getItem('aq_user');
      if (saved) {
        try {
          const { uid, username } = JSON.parse(saved);
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.banned) {
              localStorage.removeItem('aq_user');
              setLoading(false);
              return;
            }
            if (!data.unlockedAvatars) {
               data.unlockedAvatars = ['🦊', '🦉', '🦄', '🐉', '🦁', '🐧', '👩‍🎓', '👨‍🎓'];
               await updateDoc(snap.ref, { unlockedAvatars: data.unlockedAvatars });
            }
            setCurrentUser({ uid, username });
            setUserData(data);
          } else {
            localStorage.removeItem('aq_user');
          }
        } catch (err) {
          console.error('Session restore error:', err);
          localStorage.removeItem('aq_user');
        }
      }
      
      const elapsed = Date.now() - startTime;
      const minDelay = 2500;
      if (elapsed < minDelay) {
        setTimeout(() => setLoading(false), minDelay - elapsed);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Real-time listener to keep userData in sync (points, badges, etc.)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      }
    });
    return unsub;
  }, [currentUser]);

  const value = {
    currentUser, userData, loading,
    register, login, logout, isAdmin, updateUserFields
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <StarryLoading /> : children}
    </AuthContext.Provider>
  );
}
