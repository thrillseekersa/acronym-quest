import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getDailyAcronyms } from '../utils/dailyAcronyms';
import Avatar from '../components/Avatar';

const STUDY_TIME = 30 * 60; // 30 minutes in seconds

export default function ManualView() {
  const [dailyAcronyms, setDailyAcronyms] = useState([]);
  const [timer, setTimer] = useState(STUDY_TIME);
  const [lockedOut, setLockedOut] = useState(false);
  const { currentUser, userData, logout, updateUserFields } = useAuth();
  const navigate = useNavigate();

  // Check if already studied today
  useEffect(() => {
    if (!userData) return;
    const today = new Date().toISOString().slice(0, 10);
    if (userData.lastStudyDate === today) {
      setLockedOut(true);
    }
  }, [userData?.lastStudyDate]);

  // Fetch daily acronyms
  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'acronyms'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDailyAcronyms(getDailyAcronyms(all, 30));
    }
    load();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (lockedOut || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Lock out for the day
          const today = new Date().toISOString().slice(0, 10);
          updateUserFields({ lastStudyDate: today });
          setLockedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedOut, timer]);

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  // ── LOCKED OUT SCREEN ──
  if (lockedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-soft text-center py-10 px-8 max-w-md w-full"
        >
          <div className="text-7xl mb-4">📚</div>
          <h1 className="text-3xl font-bold text-indigo-600 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Great Work!
          </h1>
          <p className="text-cosmic-muted text-base mb-6">
            You've completed your study session for today.<br />
            Come back tomorrow for a new set of acronyms!
          </p>
          <div className="bg-indigo-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-indigo-600 font-semibold">
              ✨ Consistency is key — see you tomorrow!
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/auth'); }}
            className="btn-soft btn-soft-purple text-sm"
          >
            🚪 Logout
          </button>
        </motion.div>
      </div>
    );
  }

  // ── STUDY SCREEN ──
  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            ✏️ Acronym Quest
          </h1>
          <p className="text-cosmic-muted text-sm font-semibold flex items-center">
            <Avatar avatar={userData?.avatar} size={28} className="mr-2" />
            <span>{userData?.fullName} · <span className="text-cosmic-purple-light">Study Mode</span></span>
          </p>
        </div>
        <button onClick={() => { logout(); navigate('/auth'); }} className="btn-soft btn-soft-purple text-sm">
          🚪 Logout
        </button>
      </div>

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

      {/* Info banner */}
      <div className="bg-indigo-50 rounded-xl p-3 mb-4 text-center">
        <p className="text-sm text-indigo-600 font-semibold">
          📖 Study these acronyms carefully — you have 30 minutes!
        </p>
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
    </div>
  );
}
