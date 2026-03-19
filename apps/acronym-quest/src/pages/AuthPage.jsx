import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StarryLoading from '../components/StarryLoading';
import Avatar from '../components/Avatar';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [shakeUsername, setShakeUsername] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef();

  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regGrade, setRegGrade] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAvatar, setRegAvatar] = useState('🦊');

  const avatars = ['🦊', '🦉', '🦄', '🐉', '🦁', '🐧', '👩‍🎓', '👨‍🎓'];
  const photoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  async function handleRegPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const storageRef = ref(storage, `avatars/reg_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setRegAvatar(url);
    } catch (err) {
      console.error('Photo upload error:', err);
    }
    setPhotoUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    const startTime = Date.now();
    try {
      await login(loginUsername, loginPassword);
      const elapsed = Date.now() - startTime;
      if (elapsed < 2500) await delay(2500 - elapsed);
      navigate('/');
    } catch (err) {
      if (err.message === 'BANNED') {
        setError('🚫 Your account has been suspended for inappropriate behavior.');
      } else {
        setError('Invalid credentials. Try again! 📚');
      }
    }
    setFormLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    const startTime = Date.now();
    try {
      await register(regFullName, regSchool, regGrade, regUsername, regPassword, regAvatar);
      const elapsed = Date.now() - startTime;
      if (elapsed < 2500) await delay(2500 - elapsed);
      navigate('/');
    } catch (err) {
      if (err.message === 'USERNAME_TAKEN') {
        setShakeUsername(true);
        setError('📚 That username is taken! Try another!');
        setTimeout(() => setShakeUsername(false), 600);
      } else if (err.code === 'auth/email-already-in-use') {
        setShakeUsername(true);
        setError('📚 That username is taken! Try another!');
        setTimeout(() => setShakeUsername(false), 600);
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters!');
      } else {
        setError(err.message);
      }
    }
    setFormLoading(false);
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      {formLoading && <StarryLoading />}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-5xl mb-2"
            animate={{ rotate: [0, -2, 2, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            📚
          </motion.h1>
          <h1 className="text-4xl text-indigo-600 font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Acronym Quest
          </h1>
          <p className="text-cosmic-muted text-sm font-semibold">
            The easiest way to master IT acronyms!
          </p>
        </div>

        {/* Card */}
        <div className="card-soft">
          {/* Toggle */}
          <div className="flex mb-6 rounded-2xl overflow-hidden border-4 border-cosmic-surface">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3 font-bold text-sm transition-all ${
                isLogin ? 'bg-baby-purple text-cosmic-text' : 'bg-cosmic-bg text-cosmic-muted'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3 font-bold text-sm transition-all ${
                !isLogin ? 'bg-baby-purple text-cosmic-text' : 'bg-cosmic-bg text-cosmic-muted'
              }`}
            >
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 rounded-xl bg-red-500/20 border-2 border-red-500/40 text-red-300 text-sm font-semibold text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-1">Username</label>
                    <input
                      className="input-soft"
                      placeholder="Enter your username"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-1">Password</label>
                    <input
                      className="input-soft"
                      type="password"
                      placeholder="Your secret code"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="btn-soft btn-soft-purple w-full text-lg"
                  >
                    {formLoading ? '⌛ Signing in...' : 'Sign In'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-1">Full Name</label>
                    <input
                      className="input-soft"
                      placeholder="e.g. Alex Smith"
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-1">School</label>
                    <input
                      className="input-soft"
                      placeholder="e.g. Greenwood High"
                      value={regSchool}
                      onChange={e => setRegSchool(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-cosmic-purple-light mb-1">Grade</label>
                    <input
                      className="input-soft"
                      placeholder="Grade 10"
                      value={regGrade}
                      onChange={e => setRegGrade(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-1">Username</label>
                    <input
                      ref={usernameRef}
                      className={`input-soft ${shakeUsername ? 'shake' : ''}`}
                      placeholder="Choose a username"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-1">Password</label>
                    <input
                      className="input-soft"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-cosmic-muted mb-2">Choose Character</label>
                    <div className="flex flex-wrap gap-2 justify-center bg-cosmic-surface/50 p-2 rounded-2xl border-2 border-cosmic-surface">
                      {avatars.map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setRegAvatar(a)}
                          className={`text-2xl p-2 rounded-xl transition-all ${regAvatar === a ? 'bg-indigo-100 border-2 border-indigo-400 scale-110 shadow-md' : 'hover:bg-white/50 border-2 border-transparent opacity-70 hover:opacity-100'}`}
                        >
                          {a}
                        </button>
                      ))}
                      {/* Photo upload button */}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleRegPhotoUpload}
                        className="hidden"
                        id="reg-avatar-photo"
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        className={`text-2xl p-2 rounded-xl transition-all ${
                          regAvatar?.startsWith?.('http') || regAvatar?.startsWith?.('data:')
                            ? 'bg-indigo-100 border-2 border-indigo-400 scale-110 shadow-md'
                            : 'hover:bg-white/50 border-2 border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        {photoUploading ? '⏳' : '📷'}
                      </button>
                    </div>
                    {(regAvatar?.startsWith?.('http') || regAvatar?.startsWith?.('data:')) && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Avatar avatar={regAvatar} size={36} />
                        <span className="text-xs text-cosmic-muted">Your photo</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="btn-soft btn-soft-blue w-full text-lg"
                  >
                    {formLoading ? '⌛ Creating...' : 'Create Account'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-cosmic-muted text-xs mt-4">
          Mastering acronyms, one step at a time 🌟
        </p>
      </motion.div>
    </div>
  );
}
