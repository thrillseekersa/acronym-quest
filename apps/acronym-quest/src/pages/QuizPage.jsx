import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import StarryLoading from '../components/StarryLoading';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuizPage() {
  const [acronyms, setAcronyms] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizState, setQuizState] = useState('loading'); // loading, ready, active, finished
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(null);
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  // Fetch acronyms
  useEffect(() => {
    async function load() {
      const startTime = Date.now();
      try {
        const snap = await getDocs(collection(db, 'acronyms'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAcronyms(data);
        
        const elapsed = Date.now() - startTime;
        if (elapsed < 2500) await new Promise(r => setTimeout(r, 2500 - elapsed));
        
        if (data.length >= 4) {
          setQuizState('ready');
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  // Generate quiz questions
  function generateQuestions() {
    const shuffled = [...acronyms].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);

    const qs = selected.map((correct, idx) => {
      // Get 3 wrong options (different from correct)
      const others = acronyms.filter(a => a.id !== correct.id);
      const wrongOnes = others.sort(() => Math.random() - 0.5).slice(0, 3);

      // Build options for breakdown
      const breakdownOptions = [correct, ...wrongOnes]
        .sort(() => Math.random() - 0.5)
        .map(a => ({ text: a.breakdown, isCorrect: a.id === correct.id }));

      // Build options for meaning
      const meaningOptions = [correct, ...wrongOnes]
        .sort(() => Math.random() - 0.5)
        .map(a => ({ text: a.meaning, isCorrect: a.id === correct.id }));

      return {
        id: idx,
        acronym: correct.acronym,
        correctId: correct.id,
        breakdownOptions,
        meaningOptions
      };
    });

    setQuestions(qs);
    setAnswers({});
    setTimer(120);
    setQuizState('active');
  }

  // Timer countdown
  useEffect(() => {
    if (quizState !== 'active' || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quizState, timer]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (quizState === 'active' && timer === 0) {
      handleSubmit();
    }
  }, [timer, quizState]);

  // Submit quiz
  const handleSubmit = useCallback(async () => {
    if (quizState === 'finished') return;
    setQuizState('finished');

    let correct = 0;
    questions.forEach(q => {
      const bAnswer = answers[`b_${q.id}`];
      const mAnswer = answers[`m_${q.id}`];
      // Star point: both breakdown AND meaning must be correct
      if (bAnswer !== undefined && mAnswer !== undefined) {
        const bCorrect = q.breakdownOptions[bAnswer]?.isCorrect;
        const mCorrect = q.meaningOptions[mAnswer]?.isCorrect;
        if (bCorrect && mCorrect) correct++;
      }
    });

    const percentage = Math.round((correct / questions.length) * 100);
    setScore({ correct, total: questions.length, percentage, timeLeft: timer });

    // Save to Firestore
    try {
      await addDoc(collection(db, 'research_results'), {
        userId: currentUser.uid,
        username: userData.username,
        studyGroup: userData.studyGroup,
        score: correct,
        total: questions.length,
        percentage,
        timeUsed: 120 - timer,
        timestamp: serverTimestamp()
      });

      // Update user points
      const newPoints = (userData.points || 0) + correct;
      const newQuizCount = (userData.quizzesTaken || 0) + 1;
      const userRef = doc(db, 'users', currentUser.uid);

      // Check badges
      const newBadges = [...(userData.badges || [])];
      if (!newBadges.includes('first_quiz')) newBadges.push('first_quiz');
      if (percentage === 100 && !newBadges.includes('perfect')) newBadges.push('perfect');
      if (timer > 30 && !newBadges.includes('speedy')) newBadges.push('speedy');
      if (newQuizCount >= 3 && !newBadges.includes('streak_3')) newBadges.push('streak_3');
      if (newQuizCount >= 5 && !newBadges.includes('streak_5')) newBadges.push('streak_5');
      if (newPoints >= 50 && !newBadges.includes('points_50')) newBadges.push('points_50');
      if (newPoints >= 100 && !newBadges.includes('points_100')) newBadges.push('points_100');
      if (newQuizCount >= 10 && !newBadges.includes('streak_10')) newBadges.push('streak_10');
      if (newPoints >= 200 && !newBadges.includes('points_200')) newBadges.push('points_200');

      await updateDoc(userRef, {
        points: newPoints,
        quizzesTaken: newQuizCount,
        badges: newBadges
      });

      // Add ticker message for gamified group
      if (userData.studyGroup === 'Gamified') {
        if (percentage === 100) {
          await addDoc(collection(db, 'ticker'), {
            message: `${userData.fullName} scored PERFECT! 💯`,
            username: userData.username,
            timestamp: serverTimestamp()
          });
        } else if (correct > 0) {
          await addDoc(collection(db, 'ticker'), {
            message: `${userData.fullName} earned ${correct} star points! ⭐`,
            username: userData.username,
            timestamp: serverTimestamp()
          });
        }
        // Badge ticker
        const earnedNow = newBadges.filter(b => !(userData.badges || []).includes(b));
        for (const b of earnedNow) {
          await addDoc(collection(db, 'ticker'), {
            message: `${userData.fullName} just earned a badge! 🏅`,
            username: userData.username,
            timestamp: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error('Error saving quiz results:', err);
    }
  }, [quizState, questions, answers, currentUser, userData, timer]);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          ✏️ Acronym Quiz
        </h1>
        <button onClick={() => navigate('/')} className="btn-soft btn-soft-purple text-sm">
          ← Back
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Loading State */}
        {quizState === 'loading' && <StarryLoading />}

        {/* Ready State */}
        {quizState === 'ready' && (
          <motion.div key="ready" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-soft text-center py-8">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl text-indigo-600 font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Ready to Quiz?
            </h2>
            <p className="text-cosmic-muted mb-2 text-sm">10 questions · 2 minutes · Identify BOTH breakdown AND meaning</p>
            <p className="text-cosmic-blue font-bold text-sm mb-6">Get both right for a 🌟 Star Point!</p>
            <button onClick={generateQuestions} className="btn-soft btn-soft-blue text-lg">
              ✨ Start Quiz!
            </button>
          </motion.div>
        )}

        {/* Active Quiz */}
        {quizState === 'active' && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Timer */}
            <div className={`card-soft mb-4 flex items-center justify-between ${timer <= 10 ? 'border-red-500' : ''}`}>
              <span className="text-sm font-bold text-cosmic-muted">
                {Object.keys(answers).length / 2} / {questions.length} answered
              </span>
              <span className={`text-2xl font-bold ${timer <= 10 ? 'timer-critical' : 'text-indigo-600'}`}
                    style={{ fontFamily: 'var(--font-heading)' }}>
                ⏰ {timer}s
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card-soft"
                >
                  <h3 className="text-xl text-indigo-600 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    Q{idx + 1}. What is <span style={{ color: '#5B21B6' }}>{q.acronym}</span>?
                  </h3>

                  {/* Breakdown selection */}
                  <p className="text-xs font-bold text-cosmic-purple-light mb-2">Select the BREAKDOWN:</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {q.breakdownOptions.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers(prev => ({ ...prev, [`b_${q.id}`]: oi }))}
                        className={`p-2 rounded-xl text-xs font-semibold text-left transition-all border-2 ${
                          answers[`b_${q.id}`] === oi
                            ? 'border-cosmic-purple bg-cosmic-purple/20 text-cosmic-text'
                            : 'border-cosmic-surface bg-cosmic-bg text-cosmic-muted hover:border-cosmic-purple/50'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>

                  {/* Meaning selection */}
                  <p className="text-xs font-bold text-cosmic-purple-light mb-2">Select the MEANING:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.meaningOptions.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers(prev => ({ ...prev, [`m_${q.id}`]: oi }))}
                        className={`p-2 rounded-xl text-xs font-semibold text-left transition-all border-2 ${
                          answers[`m_${q.id}`] === oi
                            ? 'border-cosmic-blue bg-cosmic-blue/20 text-cosmic-text'
                            : 'border-cosmic-surface bg-cosmic-bg text-cosmic-muted hover:border-cosmic-blue/50'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 text-center">
                <button onClick={handleSubmit} className="btn-soft btn-soft-yellow text-lg">
                ✅ Submit Answers
              </button>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {quizState === 'finished' && score && (
          <motion.div key="finished" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-soft text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <div className="text-7xl mb-4">
                {score.percentage >= 80 ? '🏅' : score.percentage >= 50 ? '🌟' : '🌱'}
              </div>
            </motion.div>
            <h2 className="text-3xl text-indigo-600 font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {score.percentage >= 80 ? 'Excellent!' : score.percentage >= 50 ? 'Good work!' : 'Keep growing!'}
            </h2>
            <p className="text-5xl font-bold text-cosmic-text mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {score.percentage}%
            </p>
            <p className="text-cosmic-muted mb-1">
              {score.correct} / {score.total} star points earned
            </p>
            <p className="text-cosmic-muted text-sm mb-6">
              Time remaining: {score.timeLeft}s
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { setQuizState('ready'); setScore(null); }} className="btn-soft btn-soft-blue">
                🔄 Play Again
              </button>
              <button onClick={() => navigate('/')} className="btn-soft btn-soft-purple">
                🏠 Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
