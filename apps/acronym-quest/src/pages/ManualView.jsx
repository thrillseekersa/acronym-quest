import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyAcronyms } from '../utils/dailyAcronyms';
import GroupChat from '../components/GroupChat';
import Avatar from '../components/Avatar';

const STUDY_TIME = 20 * 60; // 20 minutes in seconds
const PREMIUM_AVATARS = [
  { icon: '👽', cost: 10, name: 'Alien' },
  { icon: '👻', cost: 20, name: 'Ghost' },
  { icon: '🤖', cost: 30, name: 'Robot' },
  { icon: '👑', cost: 50, name: 'Monarch' },
  { icon: '🦸‍♀️', cost: 100, name: 'Hero' },
  { icon: '🧙‍♂️', cost: 150, name: 'Wizard' },
];
const FREE_AVATARS = ['🦊', '🦉', '🦄', '🐉', '🦁', '🐧', '👩‍🎓', '👨‍🎓'];

function AvatarShopModal({ userData, updateUserFields, onClose, userId }) {
  const unlocked = userData?.unlockedAvatars || FREE_AVATARS;
  const currentAvatar = userData?.avatar || '👤';
  const points = userData?.points || 0;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleSelect(icon, cost = 0) {
    if (unlocked.includes(icon)) {
      if (currentAvatar !== icon) await updateUserFields({ avatar: icon });
    } else {
      if (points >= cost) {
        await updateUserFields({
          points: points - cost,
          unlockedAvatars: [...unlocked, icon],
          avatar: icon
        });
      }
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${userId}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateUserFields({ avatar: url });
    } catch (err) {
      console.error('Photo upload error:', err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#FAFAFA] border-4 border-indigo-200 rounded-3xl p-6 shadow-2xl max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            🛒 Avatar Shop
          </h2>
          <button onClick={onClose} className="text-cosmic-muted hover:text-cosmic-text text-xl">✖</button>
        </div>
        
        <div className="mb-4 text-center">
          <span className="text-xl font-bold text-cosmic-blue bg-cosmic-blue/10 px-4 py-2 rounded-full">
            Your Points: {points} 🌟
          </span>
        </div>

        {/* Photo Upload */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-cosmic-muted mb-2">📷 Custom Photo</h3>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoUpload}
              className="hidden"
              id="avatar-photo-manual"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`flex-1 p-3 rounded-xl border-2 transition-all font-bold text-sm flex items-center justify-center gap-2 ${
                currentAvatar?.startsWith?.('http') || currentAvatar?.startsWith?.('data:')
                  ? 'bg-indigo-100 border-indigo-400 shadow-md'
                  : 'bg-cosmic-surface/40 hover:bg-cosmic-surface border-transparent'
              }`}
            >
              {uploading ? '⏳ Uploading...' : '📷 Take Photo / Upload'}
            </button>
          </div>
          {(currentAvatar?.startsWith?.('http') || currentAvatar?.startsWith?.('data:')) && (
            <div className="mt-2 flex items-center gap-2 justify-center">
              <Avatar avatar={currentAvatar} size={40} />
              <span className="text-xs text-cosmic-muted">Current photo</span>
            </div>
          )}
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <h3 className="text-sm font-bold text-cosmic-muted mb-2">Free Characters</h3>
            <div className="grid grid-cols-4 gap-2">
              {FREE_AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => handleSelect(a, 0)}
                  className={`p-3 text-3xl rounded-xl transition-all border-2 ${
                    currentAvatar === a ? 'bg-indigo-100 border-indigo-400 scale-105 shadow-md' : 'bg-cosmic-surface/40 hover:bg-cosmic-surface hover:scale-105 border-transparent'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cosmic-muted mb-2">Premium Characters</h3>
            <div className="grid grid-cols-3 gap-3">
              {PREMIUM_AVATARS.map(p => {
                const isUnlocked = unlocked.includes(p.icon);
                const isEquipped = currentAvatar === p.icon;
                const canAfford = points >= p.cost;

                return (
                  <button
                    key={p.icon}
                    onClick={() => handleSelect(p.icon, p.cost)}
                    disabled={!isUnlocked && !canAfford}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2 ${
                      isEquipped 
                        ? 'bg-indigo-100 border-indigo-400 scale-105 shadow-md'
                        : isUnlocked
                          ? 'bg-cosmic-surface/40 hover:bg-cosmic-surface hover:scale-105 border-transparent'
                          : canAfford
                            ? 'bg-[var(--color-baby-yellow)] border-amber-300 hover:scale-105 shadow-sm'
                            : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-3xl">{p.icon}</span>
                    <span className={`text-xs font-bold ${isUnlocked ? 'text-cosmic-blue' : canAfford ? 'text-amber-600' : 'text-gray-400'}`}>
                      {isUnlocked ? 'Unlocked' : `${p.cost} 🌟`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ManualView() {
  const [dailyAcronyms, setDailyAcronyms] = useState([]);
  const [timer, setTimer] = useState(STUDY_TIME);
  const [sessionDone, setSessionDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSkipSplash, setShowSkipSplash] = useState(false);
  const { currentUser, userData, logout, updateUserFields } = useAuth();
  const navigate = useNavigate();

  // Skip-day detection
  useEffect(() => {
    if (!userData) return;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const last = userData.lastActiveDate;

    if (last && last !== today && last !== yesterday) {
      setShowSkipSplash(true);
      setTimeout(() => setShowSkipSplash(false), 3000);
    }
    if (!last || last !== today) {
      updateUserFields({ lastActiveDate: today });
    }
  }, [userData?.lastActiveDate]);

  // Fetch and select daily acronyms
  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'acronyms'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const daily = getDailyAcronyms(all, 30);
      setDailyAcronyms(daily);
    }
    load();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!started || sessionDone || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setSessionDone(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, sessionDone, timer]);

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Skip Day Splash */}
      <AnimatePresence>
        {showSkipSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: '#F0EBF0' }}
          >
            <motion.img
              src="/go-study.png"
              alt="Go Study!"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              style={{ maxWidth: 300, maxHeight: 400, objectFit: 'contain' }}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-cosmic-muted text-sm font-bold mt-4"
            >
              You missed a day! Let's get back on track 💪
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            ✏️ Acronym Quest
          </h1>
          <p className="text-cosmic-muted text-sm font-semibold flex items-center">
            <Avatar avatar={userData?.avatar} size={28} className="mr-2" />
            <span>{userData?.fullName} · <span className="text-cosmic-purple-light">Reading Mode</span></span>
          </p>
        </div>
        <button onClick={() => { logout(); navigate('/auth'); }} className="btn-soft btn-soft-purple text-sm">
          🚪 Logout
        </button>
      </div>

      {/* Pre-start — Dashboard with nav buttons */}
      {!started && !sessionDone && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
          {/* Points & Stats Bar */}
          <div className="card-soft flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar avatar={userData?.avatar} size={36} />
              <div>
                <p className="font-bold text-cosmic-text text-sm">{userData?.fullName}</p>
                <p className="text-cosmic-muted text-xs">{userData?.quizzesTaken || 0} quizzes completed</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-indigo-600" style={{ fontFamily: 'var(--font-heading)' }}>
                {userData?.points || 0} 🌟
              </p>
              <p className="text-cosmic-muted text-xs font-semibold">Points</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, y: 3 }}
              onClick={() => setStarted(true)}
              disabled={dailyAcronyms.length === 0}
              className="nav-btn nav-btn-blue flex-1"
            >
              <div className="nav-btn-icon">📚</div>
              <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Study</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, y: 3 }}
              onClick={() => navigate('/quiz')}
              className="nav-btn nav-btn-yellow flex-1"
            >
              <div className="nav-btn-icon">📝</div>
              <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Quiz</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, y: 3 }}
              onClick={() => setShowShop(true)}
              className="nav-btn nav-btn-purple"
              style={{ minWidth: 80 }}
            >
              <div className="nav-btn-icon">🛒</div>
              <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Shop</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, y: 3 }}
              onClick={() => setShowChat(true)}
              className="nav-btn nav-btn-green"
              style={{ minWidth: 80 }}
            >
              <div className="nav-btn-icon">💬</div>
              <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Chat</span>
            </motion.button>
          </div>

          {/* Today's Info Card */}
          <div className="card-soft text-center py-4">
            <h2 className="text-lg text-indigo-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              📖 Today's Learning
            </h2>
            <p className="text-cosmic-muted text-sm mb-2">
              {dailyAcronyms.length} acronyms · Study for 20 minutes!
            </p>
            <div className="flex justify-center gap-4 my-3 text-xs">
              <div className="bg-cosmic-surface/50 rounded-xl p-2 text-center">
                <p className="text-cosmic-purple-light font-bold">📚 Study</p>
                <p className="text-cosmic-muted">20 min review</p>
              </div>
              <div className="text-cosmic-muted text-xl self-center">→</div>
              <div className="bg-cosmic-surface/50 rounded-xl p-2 text-center">
                <p className="text-cosmic-blue font-bold">📝 Quiz</p>
                <p className="text-cosmic-muted">Test yourself</p>
              </div>
              <div className="text-cosmic-muted text-xl self-center">→</div>
              <div className="bg-cosmic-surface/50 rounded-xl p-2 text-center">
                <p className="text-amber-500 font-bold">🛒 Shop</p>
                <p className="text-cosmic-muted">Spend points!</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Study */}
      {started && !sessionDone && (
        <div>
          {/* Timer bar */}
          <div className="card-soft mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-cosmic-muted">
              {dailyAcronyms.length} acronyms
            </span>
            <span className={`text-2xl font-bold ${timer <= 60 ? 'timer-critical' : 'text-indigo-600'}`}
                  style={{ fontFamily: 'var(--font-heading)' }}>
              ⏰ {minutes}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-cosmic-surface rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-cosmic-purple rounded-full"
              animate={{ width: `${((STUDY_TIME - timer) / STUDY_TIME) * 100}%` }}
            />
          </div>

          {/* Acronym list */}
          <div className="space-y-2">
             {dailyAcronyms.map((a, i) => (
              <motion.div
                key={a.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-soft flex flex-col gap-1"
              >
                <div className="flex items-center gap-3">
                  <span className="text-indigo-600 font-bold text-xl shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>
                    {a.acronym}
                  </span>
                  <span className="text-cosmic-text text-base font-semibold">
                    {a.breakdown}
                  </span>
                </div>
                <p className="text-cosmic-muted text-base pl-1">{a.meaning}</p>
              </motion.div>
            ))}
          </div>

          {/* Back button */}
          <div className="mt-4 text-center">
            <button onClick={() => { setStarted(false); setTimer(STUDY_TIME); }} className="btn-soft btn-soft-purple text-sm">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Session Complete */}
      {sessionDone && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-soft text-center py-8">
          <div className="text-7xl mb-4">✅</div>
          <h2 className="text-3xl text-indigo-600 font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Session Complete!
          </h2>
          <p className="text-cosmic-muted mb-6">
            You studied {dailyAcronyms.length} acronyms. Great work!
          </p>
          <button onClick={() => { setStarted(false); setSessionDone(false); setTimer(STUDY_TIME); }} className="btn-soft btn-soft-blue">
            🏠 Back to Dashboard
          </button>
        </motion.div>
      )}

      {/* Avatar Shop Modal */}
      <AnimatePresence>
        {showShop && (
          <AvatarShopModal
            userData={userData}
            updateUserFields={updateUserFields}
            onClose={() => setShowShop(false)}
            userId={currentUser?.uid}
          />
        )}
      </AnimatePresence>
      <GroupChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
