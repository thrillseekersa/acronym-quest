import { useState, useEffect, useCallback, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyAcronyms, getTodayString } from '../utils/dailyAcronyms';
import { generateDistractors } from '../utils/distractors';
import GroupChat from '../components/GroupChat';
import { askAI as askAIService } from '../services/ai';
import Avatar from '../components/Avatar';

const STUDY_TIME = 15 * 60;   // 15 minutes study
const QUIZ_TIME = 15 * 60;    // 15 minutes quiz
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
              id="avatar-photo-shop"
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

export default function GamifiedDashboard() {
  const [dailyAcronyms, setDailyAcronyms] = useState([]);
  const [allAcronyms, setAllAcronyms] = useState([]);
  const [phase, setPhase] = useState('start'); // start, study, quiz, results
  const [timer, setTimer] = useState(STUDY_TIME);
  const [score, setScore] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [currentQ, setCurrentQ] = useState(null);
  const [qStep, setQStep] = useState('breakdown'); // breakdown, meaning, feedback
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [breakdownCorrect, setBreakdownCorrect] = useState(false);
  const [feedbackType, setFeedbackType] = useState(''); // correct, wrong
  const [leaderboard, setLeaderboard] = useState([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [masteredIds, setMasteredIds] = useState(new Set()); // correctly answered acronym IDs
  const { currentUser, userData, logout, updateUserFields } = useAuth();
  const navigate = useNavigate();
  const [showShop, setShowShop] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSkipSplash, setShowSkipSplash] = useState(false);
  const [studyLocked, setStudyLocked] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Check if already studied today
  useEffect(() => {
    if (!userData) return;
    const today = new Date().toISOString().slice(0, 10);
    if (userData.lastStudyDate === today) {
      setStudyLocked(true);
    }
  }, [userData?.lastStudyDate]);

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
    // Update last active date
    if (!last || last !== today) {
      updateUserFields({ lastActiveDate: today });
    }
  }, [userData?.lastActiveDate]);

  // Super Combo state
  const [streak, setStreak] = useState(0);
  const [superComboActive, setSuperComboActive] = useState(false);
  const [superComboRemaining, setSuperComboRemaining] = useState(0);
  const [superComboScore, setSuperComboScore] = useState(0);
  const [showComboTrigger, setShowComboTrigger] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  // AI Chat state
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send a question to the AI tutor
  async function askAI() {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);

    try {
      const currentAcronym = dailyAcronyms[0];
      const answer = await askAIService(
        currentAcronym?.acronym || '',
        currentAcronym?.breakdown || '',
        currentAcronym?.meaning || '',
        question
      );
      setChatMessages(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (err) {
      console.error('AI chat error:', err);
      setChatMessages(prev => [...prev, { role: 'ai', text: '✨ Oops! Could not reach the AI tutor. Please try again. 🔧' }]);
    }
    setChatLoading(false);
  }

  // Fetch acronyms
  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'acronyms'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllAcronyms(all);
      const daily = getDailyAcronyms(all, 30);
      setDailyAcronyms(daily);
    }
    load();
  }, []);

  // Live leaderboard for today's gamified results
  useEffect(() => {
    const today = getTodayString();
    const q = query(
      collection(db, 'research_results'),
      where('date', '==', today),
      where('studyGroup', '==', 'Gamified'),
      orderBy('score', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      // Index might not exist yet — show empty
      console.log('Leaderboard query needs composite index:', err.message);
    });
    return unsub;
  }, []);

  // Timer countdown (pauses during Super Combo)
  useEffect(() => {
    if (phase !== 'study' && phase !== 'quiz') return;
    if (timer <= 0) return;
    if (timerPaused) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (phase === 'study') {
            // Auto-transition to quiz
            setPhase('quiz');
            setTimer(QUIZ_TIME);
            generateQuestion();
          } else {
            // Quiz time's up
            finishQuiz();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timer, timerPaused]);

  // Generate a rapid-fire question with letter-matched distractors
  // Prioritize unseen/incorrect acronyms; only repeat mastered ones when all are done
  function generateQuestion() {
    if (dailyAcronyms.length < 4) return;
    
    // Pick from unmastered acronyms first
    const unmastered = dailyAcronyms.filter(a => !masteredIds.has(a.id));
    const pool = unmastered.length > 0 ? unmastered : dailyAcronyms;
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const others = dailyAcronyms.filter(a => a.id !== correct.id);

    // Generate letter-matched fake breakdowns (e.g. for "HD" → "Horizontal Display")
    const otherBreakdowns = others.map(a => a.breakdown);
    const fakeBreakdowns = generateDistractors(correct.acronym, correct.breakdown, otherBreakdowns);
    const breakdownOpts = [
      { text: correct.breakdown, isCorrect: true },
      ...fakeBreakdowns.map(fb => ({ text: fb, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    // For meaning options, use meanings from other acronyms (they're already plausible)
    const wrongMeanings = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const meaningOpts = [
      { text: correct.meaning, isCorrect: true },
      ...wrongMeanings.map(a => ({ text: a.meaning, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    setCurrentQ({
      acronym: correct.acronym,
      correctId: correct.id,
      breakdownOptions: breakdownOpts,
      meaningOptions: meaningOpts,
      isComboQuestion: false
    });
    setQStep('breakdown');
    setSelectedAnswer(null);
    setBreakdownCorrect(false);
    setFeedbackType('');
  }

  // Generate a harder question for the Super Combo round
  function generateComboQuestion() {
    if (dailyAcronyms.length < 4) return;
    
    // Prefer unmastered acronyms for harder challenge
    const unmastered = dailyAcronyms.filter(a => !masteredIds.has(a.id));
    const pool = unmastered.length > 0 ? unmastered : dailyAcronyms;
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const others = dailyAcronyms.filter(a => a.id !== correct.id);

    // Generate letter-matched fake breakdowns (all distractors are letter-matched for difficulty)
    const otherBreakdowns = others.map(a => a.breakdown);
    const fakeBreakdowns = generateDistractors(correct.acronym, correct.breakdown, otherBreakdowns);
    const breakdownOpts = [
      { text: correct.breakdown, isCorrect: true },
      ...fakeBreakdowns.map(fb => ({ text: fb, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    // Use more similar meanings for harder challenge
    const wrongMeanings = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const meaningOpts = [
      { text: correct.meaning, isCorrect: true },
      ...wrongMeanings.map(a => ({ text: a.meaning, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    setCurrentQ({
      acronym: correct.acronym,
      correctId: correct.id,
      breakdownOptions: breakdownOpts,
      meaningOptions: meaningOpts,
      isComboQuestion: true
    });
    setQStep('breakdown');
    setSelectedAnswer(null);
    setBreakdownCorrect(false);
    setFeedbackType('');
  }

  // Trigger the Super Combo sequence
  function triggerSuperCombo() {
    setShowComboTrigger(true);
    setTimerPaused(true);
    setSuperComboActive(true);
    setSuperComboRemaining(4);
    setSuperComboScore(0);
    setStreak(0);

    // Show the trigger animation for 1.5s, then start the first combo question
    setTimeout(() => {
      setShowComboTrigger(false);
      generateComboQuestion();
    }, 1500);
  }

  // Handle breakdown answer
  function handleBreakdownAnswer(idx) {
    const isCorrect = currentQ.breakdownOptions[idx].isCorrect;
    setSelectedAnswer(idx);
    setBreakdownCorrect(isCorrect);
    // Move to meaning step after brief delay
    setTimeout(() => {
      setQStep('meaning');
      setSelectedAnswer(null);
    }, 400);
  }

  // Handle meaning answer
  function handleMeaningAnswer(idx) {
    const meaningCorrect = currentQ.meaningOptions[idx].isCorrect;
    setSelectedAnswer(idx);
    setTotalAttempted(prev => prev + 1);

    const isCorrect = breakdownCorrect && meaningCorrect;

    if (superComboActive) {
      // Super Combo mode — 2× points
      if (isCorrect) {
        setScore(prev => prev + 2);
        setSuperComboScore(prev => prev + 2);
        setFeedbackType('combo-correct');
        setMasteredIds(prev => new Set([...prev, currentQ.correctId]));
      } else {
        setFeedbackType('combo-wrong');
      }

      setQStep('feedback');
      setQuestionsAnswered(prev => prev + 1);

      const remaining = superComboRemaining - 1;
      setSuperComboRemaining(remaining);

      // Faster feedback during combo (500ms)
      setTimeout(() => {
        if (remaining > 0) {
          generateComboQuestion();
        } else {
          // Combo round finished — resume normal play
          setSuperComboActive(false);
          setTimerPaused(false);
          setFeedbackType('combo-end');
          setQStep('feedback');
          setTimeout(() => {
            if (timer > 1) {
              generateQuestion();
            } else {
              finishQuiz();
            }
          }, 1200);
        }
      }, 500);
    } else {
      // Normal mode
      if (isCorrect) {
        setScore(prev => prev + 1);
        setFeedbackType('correct');
        setMasteredIds(prev => new Set([...prev, currentQ.correctId]));
        // Track streak
        const newStreak = streak + 1;
        setStreak(newStreak);

        if (newStreak >= 5) {
          // Trigger Super Combo!
          setQStep('feedback');
          setQuestionsAnswered(prev => prev + 1);
          setTimeout(() => {
            triggerSuperCombo();
          }, 600);
          return;
        }
      } else {
        setFeedbackType('wrong');
        setStreak(0);
        // Track wrong answer for review
        const correctBreakdown = currentQ.breakdownOptions.find(o => o.isCorrect)?.text;
        const correctMeaning = currentQ.meaningOptions.find(o => o.isCorrect)?.text;
        const acronym = dailyAcronyms.find(a => a.id === currentQ.correctId);
        setWrongAnswers(prev => [...prev, {
          acronym: acronym?.acronym || '?',
          correctBreakdown: correctBreakdown || '',
          correctMeaning: correctMeaning || '',
          yourBreakdown: breakdownCorrect ? correctBreakdown : currentQ.breakdownOptions[selectedAnswer]?.text || '?',
          yourMeaning: meaningCorrect ? correctMeaning : currentQ.meaningOptions[idx]?.text || '?',
          breakdownWrong: !breakdownCorrect,
          meaningWrong: !meaningCorrect
        }]);
      }

      setQStep('feedback');
      setQuestionsAnswered(prev => prev + 1);

      // Next question after brief feedback
      setTimeout(() => {
        if (timer > 1) {
          generateQuestion();
        } else {
          finishQuiz();
        }
      }, 800);
    }
  }

  // Save results
  const finishQuiz = useCallback(async () => {
    if (phase === 'results') return;
    setPhase('results');

    try {
      await addDoc(collection(db, 'research_results'), {
        userId: currentUser.uid,
        username: userData.username,
        fullName: userData.fullName,
        studyGroup: 'Gamified',
        score: score,
        total: totalAttempted,
        percentage: totalAttempted > 0 ? Math.round((score / totalAttempted) * 100) : 0,
        questionsAnswered: questionsAnswered,
        date: getTodayString(),
        timestamp: serverTimestamp()
      });

      // Update user points and lock study for the day
      const newPoints = (userData.points || 0) + score;
      const newQuizCount = (userData.quizzesTaken || 0) + 1;
      const today = new Date().toISOString().slice(0, 10);
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: newPoints,
        quizzesTaken: newQuizCount,
        lastStudyDate: today
      });
      setStudyLocked(true);
    } catch (err) {
      console.error('Error saving results:', err);
    }
  }, [phase, score, totalAttempted, questionsAnswered, currentUser, userData]);

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
            <span>{userData?.fullName} · <span className="text-cosmic-blue">Gamified</span></span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { logout(); navigate('/auth'); }} className="btn-soft btn-soft-purple text-sm">
            🚪 Logout
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* START SCREEN */}
        {phase === 'start' && (
          <motion.div key="start" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
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
                whileHover={!studyLocked ? { scale: 1.05 } : {}}
                whileTap={!studyLocked ? { scale: 0.95, y: 3 } : {}}
                onClick={() => { setPhase('study'); setTimer(STUDY_TIME); }}
                disabled={dailyAcronyms.length === 0 || studyLocked}
                className={`nav-btn nav-btn-blue flex-1 ${studyLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="nav-btn-icon">{studyLocked ? '🔒' : '📚'}</div>
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{studyLocked ? 'Done!' : 'Study'}</span>
              </motion.button>

              <motion.button
                whileHover={!studyLocked ? { scale: 1.05 } : {}}
                whileTap={!studyLocked ? { scale: 0.95, y: 3 } : {}}
                onClick={() => { setPhase('quiz'); setTimer(QUIZ_TIME); generateQuestion(); }}
                disabled={dailyAcronyms.length === 0 || studyLocked}
                className={`nav-btn nav-btn-yellow flex-1 ${studyLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="nav-btn-icon">{studyLocked ? '🔒' : '📝'}</div>
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{studyLocked ? 'Done!' : 'Quiz'}</span>
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

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 3 }}
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="nav-btn nav-btn-yellow"
                style={{ minWidth: 80 }}
              >
                <div className="nav-btn-icon">🏆</div>
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Board</span>
              </motion.button>
            </div>

            {/* Daily lockout banner */}
            {studyLocked && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-sm text-green-700 font-semibold">
                  ✅ You've completed today's study session! Come back tomorrow for new words.
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Shop & Chat are still open — spend your points! 🛒💬
                </p>
              </div>
            )}

            {/* Today's Info Card */}
            <div className="card-soft text-center py-4">
              <h2 className="text-lg text-indigo-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                📖 Today's Learning
              </h2>
              <p className="text-cosmic-muted text-sm mb-2">
                {dailyAcronyms.length} acronyms · Study then Quiz to earn points!
              </p>
              <div className="flex justify-center gap-4 my-3 text-xs">
                <div className="bg-cosmic-surface/50 rounded-xl p-2 text-center">
                  <p className="text-cosmic-purple-light font-bold">📚 Study</p>
                  <p className="text-cosmic-muted">15 min review</p>
                </div>
                <div className="text-cosmic-muted text-xl self-center">→</div>
                <div className="bg-cosmic-surface/50 rounded-xl p-2 text-center">
                  <p className="text-cosmic-blue font-bold">📝 Quiz</p>
                  <p className="text-cosmic-muted">15 min rapid-fire</p>
                </div>
                <div className="text-cosmic-muted text-xl self-center">→</div>
                <div className="bg-cosmic-surface/50 rounded-xl p-2 text-center">
                  <p className="text-amber-500 font-bold">🛒 Shop</p>
                  <p className="text-cosmic-muted">Spend points!</p>
                </div>
              </div>
              <p className="text-cosmic-blue font-bold text-xs">
                Match BOTH breakdown AND meaning for each point! 🌟
              </p>
            </div>

            {/* Leaderboard */}
            <AnimatePresence>
              {showLeaderboard && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card-soft overflow-hidden"
                >
                  <h3 className="text-lg text-indigo-600 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    🏆 Today's Leaderboard
                  </h3>
                  {leaderboard.length === 0 ? (
                    <p className="text-cosmic-muted text-sm text-center py-4">No scores yet — be the first! 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry, i) => (
                        <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-xl ${
                          entry.username === userData?.username ? 'bg-cosmic-blue/20 border border-cosmic-blue' : 'bg-cosmic-surface/30'
                        }`}>
                          <span className="text-2xl font-bold text-indigo-600 w-8 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </span>
                          <span className="font-bold text-cosmic-text flex-1">
                            <Avatar avatar={entry.avatar} size={24} className="mr-2" />
                            {entry.fullName || entry.username}
                          </span>
                          <span className="text-cosmic-blue font-bold">{entry.score} ⭐</span>
                          <span className="text-cosmic-muted text-xs">{entry.questionsAnswered || 0}Q</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* STUDY PHASE */}
        {phase === 'study' && (
          <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Timer */}
            <div className="card-soft mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-cosmic-purple-light font-bold text-sm">📖 STUDY PHASE</span>
              </div>
              <span className={`text-2xl font-bold ${timer <= 30 ? 'timer-critical' : 'text-indigo-600'}`}
                    style={{ fontFamily: 'var(--font-heading)' }}>
                ⏱️ {minutes}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <div className="h-2 bg-cosmic-surface rounded-full mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-cosmic-purple rounded-full"
                animate={{ width: `${((STUDY_TIME - timer) / STUDY_TIME) * 100}%` }}
              />
            </div>

            <p className="text-cosmic-muted text-xs text-center mb-3">
              Memorize these! You'll be tested on <span className="text-cosmic-blue font-bold">breakdown AND meaning</span>
            </p>

            <div className="space-y-2">
              {dailyAcronyms.map((a, i) => (
                <motion.div
                  key={a.id || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="card-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-600 font-bold text-xl shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>
                      {a.acronym}
                    </span>
                    <span className="text-cosmic-text text-base font-semibold">{a.breakdown}</span>
                  </div>
                  <p className="text-cosmic-muted text-base pl-1">{a.meaning}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <button onClick={() => { setPhase('quiz'); setTimer(QUIZ_TIME); generateQuestion(); }} className="btn-soft btn-amber text-sm">
                ⚡ Skip to Quiz Early
              </button>
            </div>
          </motion.div>
        )}

        {/* SUPER COMBO TRIGGER ANIMATION */}
        {showComboTrigger && (
            <motion.div
            key="combo-trigger"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
            style={{ background: 'rgba(255, 255, 255, 0.9)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-center"
            >
              <motion.div
                className="text-8xl mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <h2 className="text-4xl text-indigo-600 font-bold combo-trigger-text" style={{ fontFamily: 'var(--font-heading)' }}>
                SUPER STREAK!
              </h2>
              <p className="text-cosmic-blue font-bold text-lg mt-2">4 Bonus Questions · 2× Points!</p>
              <div className="flex justify-center gap-2 mt-3">
                {['✨','🌟','🌈','💎'].map((e, i) => (
                  <motion.span
                    key={i}
                    className="text-3xl"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                  >{e}</motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* RAPID-FIRE QUIZ */}
        {phase === 'quiz' && currentQ && !showComboTrigger && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Timer + Score bar */}
            <div className={`card-soft mb-4 flex items-center justify-between ${superComboActive ? 'super-combo-card' : ''}`}>
              <div className="flex items-center gap-3">
                {superComboActive ? (
                  <span className="text-indigo-600 font-bold text-sm combo-badge">✨ SUPER STREAK</span>
                ) : (
                  <span className="text-cosmic-blue font-bold text-sm">🧩 RAPID ROUND</span>
                )}
                <span className="text-indigo-600 font-bold">{score} 🌟</span>
                {streak > 0 && !superComboActive && (
                  <motion.span
                    key={streak}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xs font-bold text-cosmic-purple bg-baby-purple/50 px-2 py-0.5 rounded-full"
                  >
                    ✨ {streak} streak
                  </motion.span>
                )}
              </div>
              <span className={`text-2xl font-bold ${timerPaused ? 'text-cosmic-purple' : timer <= 30 ? 'timer-critical' : 'text-indigo-600'}`}
                    style={{ fontFamily: 'var(--font-heading)' }}>
                {timerPaused ? '⏸️' : '⏰'} {minutes}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            {/* Progress bar */}
            {superComboActive ? (
              <div className="flex gap-2 mb-4">
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i < (4 - superComboRemaining) ? 'bg-cosmic-amber' : 'bg-cosmic-surface'}`}
                    initial={i === (4 - superComboRemaining) ? { scale: 1.2 } : {}}
                    animate={{ scale: 1 }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-2 bg-cosmic-surface rounded-full mb-4 overflow-hidden">
                <motion.div
                  className="h-full bg-cosmic-blue rounded-full"
                  animate={{ width: `${((QUIZ_TIME - timer) / QUIZ_TIME) * 100}%` }}
                />
              </div>
            )}

            {/* Combo counter */}
            {superComboActive && (
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-3"
              >
                <span className="text-sm font-bold text-indigo-600">COMBO {4 - superComboRemaining + 1}/4</span>
                <span className="text-xs text-cosmic-purple-light ml-2">· 2× Points Active 🔥</span>
              </motion.div>
            )}

            {/* Question */}
            <motion.div
              key={`q-${totalAttempted}-${qStep}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card-soft text-center ${superComboActive ? 'super-combo-card' : ''}`}
            >
              <h3 className="text-2xl text-indigo-600 font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                {superComboActive && <span className="text-sm">✨ </span>}
                {currentQ.acronym}
                {superComboActive && <span className="text-sm"> ✨</span>}
              </h3>

              {qStep === 'feedback' ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`py-6 text-4xl`}
                >
                  {feedbackType === 'correct' ? (
                    <div>
                      <div className="text-5xl mb-2">⭐</div>
                      <p className="text-cosmic-blue font-bold text-lg">+1 Point!</p>
                    </div>
                  ) : feedbackType === 'combo-correct' ? (
                    <div>
                      <motion.div
                        className="text-5xl mb-2"
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                      >🌟🌟</motion.div>
                      <p className="text-indigo-600 font-bold text-lg">+2 STREAK POINTS! ✨</p>
                    </div>
                  ) : feedbackType === 'combo-wrong' ? (
                    <div>
                      <div className="text-5xl mb-2">❌</div>
                      <p className="text-red-400 font-bold text-lg">Missed!</p>
                    </div>
                  ) : feedbackType === 'combo-end' ? (
                    <div>
                      <motion.div
                        className="text-5xl mb-2"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                      >{superComboScore > 0 ? '🏆' : '💪'}</motion.div>
                      <p className="text-indigo-600 font-bold text-lg">Streak Complete!</p>
                      <p className="text-cosmic-blue font-bold text-sm mt-1">+{superComboScore} bonus points earned</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-5xl mb-2">❌</div>
                      <p className="text-red-400 font-bold text-lg">Not quite!</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <>
                  <p className="text-cosmic-muted text-xs mb-3">
                    {qStep === 'breakdown' 
                      ? '1/2 — Select the BREAKDOWN:' 
                      : '2/2 — Select the MEANING:'}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {(qStep === 'breakdown' ? currentQ.breakdownOptions : currentQ.meaningOptions).map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => qStep === 'breakdown' ? handleBreakdownAnswer(i) : handleMeaningAnswer(i)}
                        disabled={selectedAnswer !== null}
                        className={`p-3 rounded-xl font-semibold text-left transition-all border-2 ${
                          selectedAnswer === i
                            ? opt.isCorrect
                              ? 'border-cosmic-blue bg-cosmic-blue/20 text-cosmic-text'
                              : 'border-red-500 bg-red-500/20 text-cosmic-text'
                            : superComboActive
                              ? 'border-cosmic-amber/30 bg-cosmic-bg text-cosmic-text hover:border-cosmic-amber/70'
                              : 'border-cosmic-surface bg-cosmic-bg text-cosmic-text hover:border-cosmic-purple/50'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* RESULTS */}
        {phase === 'results' && (
          <motion.div key="results" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
            <div className="card-soft text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                <div className="text-7xl mb-4">
                  {score >= totalAttempted * 0.8 ? '🏆' : score >= totalAttempted * 0.5 ? '⭐' : '💪'}
                </div>
              </motion.div>
              <h2 className="text-3xl text-indigo-600 font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                {score >= totalAttempted * 0.8 ? 'Excellent!' : score >= totalAttempted * 0.5 ? 'Good work!' : 'Keep growing!'}
              </h2>
              <p className="text-5xl font-bold text-cosmic-text mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                {score} 🌟
              </p>
              <p className="text-cosmic-muted mb-1">
                {score} / {totalAttempted} correct ({totalAttempted > 0 ? Math.round((score / totalAttempted) * 100) : 0}%)
              </p>
              <p className="text-cosmic-muted text-sm mb-6">
                {questionsAnswered} questions attempted in 15 minutes
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setPhase('start'); setScore(0); setTotalAttempted(0); setQuestionsAnswered(0); setMasteredIds(new Set()); setStreak(0); setSuperComboActive(false); setSuperComboRemaining(0); setSuperComboScore(0); setWrongAnswers([]); setShowReview(false); }} className="btn-soft btn-soft-blue">
                  🏠 Back to Dashboard
                </button>
                {wrongAnswers.length > 0 && (
                  <button onClick={() => setShowReview(!showReview)} className="btn-soft btn-soft-purple">
                    {showReview ? '🔼 Hide Review' : `📋 Review Mistakes (${wrongAnswers.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* Wrong Answers Review */}
            <AnimatePresence>
              {showReview && wrongAnswers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="card-soft"
                >
                  <h3 className="text-lg text-red-500 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    ❌ Questions You Got Wrong
                  </h3>
                  <div className="space-y-3">
                    {wrongAnswers.map((wa, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="font-bold text-indigo-600 text-lg mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                          {wa.acronym}
                        </p>
                        {wa.breakdownWrong && (
                          <div className="text-sm mb-1">
                            <span className="text-red-500 line-through">{wa.yourBreakdown}</span>
                            <span className="text-green-600 font-bold ml-2">✓ {wa.correctBreakdown}</span>
                          </div>
                        )}
                        {wa.meaningWrong && (
                          <div className="text-sm">
                            <span className="text-red-500 line-through">{wa.yourMeaning}</span>
                            <span className="text-green-600 font-bold ml-2">✓ {wa.correctMeaning}</span>
                          </div>
                        )}
                        {!wa.breakdownWrong && !wa.meaningWrong && (
                          <p className="text-sm text-green-600 font-bold">✓ {wa.correctBreakdown} — {wa.correctMeaning}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Leaderboard */}
            <div className="card-soft">
              <h3 className="text-lg text-indigo-600 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                🏆 Today's Leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <p className="text-cosmic-muted text-sm">You're the first! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-xl ${
                      entry.username === userData?.username ? 'bg-cosmic-blue/20 border border-cosmic-blue' : 'bg-cosmic-surface/30'
                    }`}>
                      <span className="text-2xl font-bold text-indigo-600 w-8 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                      <span className="font-bold text-cosmic-text flex-1">{entry.fullName || entry.username}</span>
                      <span className="text-cosmic-blue font-bold">{entry.score} ⭐</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShop && (
          <AvatarShopModal
            userData={userData}
            updateUserFields={updateUserFields}
            onClose={() => setShowShop(false)}
            userId={currentUser.uid}
          />
        )}
      </AnimatePresence>
      <GroupChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
