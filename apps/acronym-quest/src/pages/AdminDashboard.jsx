import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc, query, orderBy, onSnapshot, deleteDoc, addDoc, serverTimestamp, limit, updateDoc, where, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/Avatar';
import GroupChat from '../components/GroupChat';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parsePdfWithAI, analyzeResults as analyzeResultsAI, moderateChat as moderateChatAI } from '../services/ai';

export default function AdminDashboard() {
  const [tab, setTab] = useState('upload'); // upload, users, analytics, moderation
  const [acronyms, setAcronyms] = useState([]);
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [pdfText, setPdfText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(''); // '', 'uploading', 'ai_formatting', 'syncing', 'done'
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [moderating, setModerating] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const { currentUser, userData, logout, updateUserFields } = useAuth();
  const navigate = useNavigate();
  const adminPhotoRef = useRef(null);

  async function handleAdminPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid) return;
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateUserFields({ avatar: url });
    } catch (err) {
      console.error('Photo upload error:', err);
    }
    if (adminPhotoRef.current) adminPhotoRef.current.value = '';
  }

  // Fetch data
  useEffect(() => {
    // Users
    const unsub1 = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Acronyms
    getDocs(collection(db, 'acronyms')).then(snap => {
      setAcronyms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Results
    const unsub2 = onSnapshot(query(collection(db, 'research_results'), orderBy('timestamp', 'desc')), (snap) => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Handle PDF file upload with AI formatting
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStage('uploading');
    setParsedRows([]);

    try {
      setUploadStage('ai_formatting');
      const arrayBuffer = await file.arrayBuffer();
      const acronyms = await parsePdfWithAI(arrayBuffer);

      if (acronyms && acronyms.length > 0) {
        setParsedRows(acronyms);
        setUploadStage('done');
      } else {
        setUploadStage('');
        alert('AI could not extract any acronyms from this PDF. Try a different file.');
      }
    } catch (err) {
      console.error('Error parsing PDF:', err);
      setUploadStage('');
      alert(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  }

  // Sync parsed data to Firestore
  async function syncToFirestore() {
    if (parsedRows.length === 0) return;
    setUploading(true);
    setUploadStage('syncing');

    try {
      // Delete existing acronyms
      const existing = await getDocs(collection(db, 'acronyms'));
      const batch1 = writeBatch(db);
      existing.docs.forEach(d => batch1.delete(d.ref));
      await batch1.commit();

      // Write new ones in batches of 500
      for (let i = 0; i < parsedRows.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = parsedRows.slice(i, i + 500);
        chunk.forEach(row => {
          const ref = doc(collection(db, 'acronyms'));
          batch.set(ref, row);
        });
        await batch.commit();
      }

      setAcronyms(parsedRows.map((r, i) => ({ id: `new-${i}`, ...r })));
      alert(`✅ ${parsedRows.length} acronyms synced to Firestore!`);
      setParsedRows([]);
      setPdfText('');
      setUploadStage('');
    } catch (err) {
      console.error('Error syncing:', err);
      alert('Sync failed.');
      setUploadStage('');
    }
    setUploading(false);
  }

  // Consult Gemini AI
  async function consultGemini() {
    setAiLoading(true);
    setAiSummary('');

    try {
      const anonymized = results.map((r, i) => ({
        student: `Student_${i + 1}`,
        studyGroup: r.studyGroup,
        score: r.score,
        total: r.total,
        percentage: r.percentage,
        timeUsed: r.timeUsed
      }));

      const summary = await analyzeResultsAI(anonymized);
      setAiSummary(summary || 'No summary generated.');
    } catch (err) {
      console.error('Error consulting Gemini:', err);
      setAiSummary('Failed to get AI analysis. Please try again.');
    }
    setAiLoading(false);
  }

  // Stats
  const manualResults = results.filter(r => r.studyGroup === 'Manual');
  const gamifiedResults = results.filter(r => r.studyGroup === 'Gamified');
  const avgManual = manualResults.length > 0 ? Math.round(manualResults.reduce((s, r) => s + (r.percentage || 0), 0) / manualResults.length) : 0;
  const avgGamified = gamifiedResults.length > 0 ? Math.round(gamifiedResults.reduce((s, r) => s + (r.percentage || 0), 0) / gamifiedResults.length) : 0;

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            ⚙️ Admin Dashboard
          </h1>
          <p className="text-cosmic-muted text-sm font-semibold flex items-center gap-2">
            <input ref={adminPhotoRef} type="file" accept="image/*" capture="user" onChange={handleAdminPhotoUpload} className="hidden" />
            <button onClick={() => adminPhotoRef.current?.click()} title="Change profile picture" className="hover:scale-110 transition-transform">
              <Avatar avatar={userData?.avatar} size={28} />
            </button>
            Admin: {userData?.fullName || 'Sayuri'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/study')} className="btn-soft btn-soft-blue text-sm">
            📚 Study
          </button>
          <button onClick={() => navigate('/quiz')} className="btn-soft btn-soft-yellow text-sm">
            📝 Quiz
          </button>
          <button onClick={() => setShowChat(true)} className="btn-soft text-sm" style={{ background: '#DCFCE7', boxShadow: '0 4px 0 0 #BBF7D0' }}>
            💬 Chat
          </button>
          <button onClick={() => { logout(); navigate('/auth'); }} className="btn-soft btn-soft-purple text-sm">
            🚪
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'upload', label: '📄 Upload', icon: null },
          { key: 'users', label: '👤 Users', icon: null },
          { key: 'analytics', label: '📊 Analytics', icon: null },
          { key: 'moderation', label: '🛡️ Moderation', icon: null }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn-soft text-sm ${tab === t.key ? 'btn-soft-yellow' : 'btn-soft-purple'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Upload Tab */}
        {tab === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card-soft mb-4">
              <h2 className="text-lg text-indigo-600 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                📄 Upload Acronym PDF
              </h2>
              <p className="text-cosmic-text font-bold text-base mb-3 tracking-wide">
                Upload any PDF with acronyms — <span className="text-indigo-600">AI will automatically extract and format them</span>
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="input-soft mb-3"
                disabled={uploading}
              />

              {/* Upload Progress Indicator */}
              {uploadStage && uploadStage !== 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-2xl bg-cosmic-surface/50 border-2 border-cosmic-purple/30"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="text-2xl"
                    >
                      {uploadStage === 'uploading' ? '📄' : '✨'}
                    </motion.div>
                    <div>
                      <p className="font-bold text-sm text-cosmic-text">
                        {uploadStage === 'uploading' && '📄 Uploading PDF...'}
                        {uploadStage === 'ai_formatting' && '✨ AI is extracting acronyms...'}
                        {uploadStage === 'syncing' && '✅ Syncing to database...'}
                      </p>
                      <p className="text-cosmic-muted text-xs">
                        {uploadStage === 'uploading' && 'Sending file to server'}
                        {uploadStage === 'ai_formatting' && 'Gemini is reading and formatting your data'}
                        {uploadStage === 'syncing' && 'Writing to Firestore database'}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-cosmic-bg rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cosmic-purple rounded-full"
                      initial={{ width: '10%' }}
                      animate={{ 
                        width: uploadStage === 'uploading' ? '30%' 
                             : uploadStage === 'ai_formatting' ? '70%' 
                             : '95%' 
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}

              {parsedRows.length > 0 && (
                <div>
                  <p className="text-cosmic-blue font-bold mb-2">✅ AI extracted {parsedRows.length} acronyms</p>
                  <div className="max-h-48 overflow-y-auto bg-cosmic-bg rounded-xl p-3 mb-3 text-xs space-y-1">
                    {parsedRows.slice(0, 20).map((r, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-indigo-600 font-bold shrink-0 w-16">{r.acronym}</span>
                        <span className="text-cosmic-purple-light flex-1">{r.breakdown}</span>
                        <span className="text-cosmic-muted flex-1">{r.meaning}</span>
                      </div>
                    ))}
                    {parsedRows.length > 20 && <p className="text-cosmic-muted">... and {parsedRows.length - 20} more</p>}
                  </div>
                  <button onClick={syncToFirestore} disabled={uploading} className="btn-soft btn-soft-blue">
                    {uploading ? '⏳ Syncing...' : '🔄 Sync to Firestore (Overwrite)'}
                  </button>
                </div>
              )}
            </div>

            {/* Current Acronyms */}
            <div className="card-soft">
              <h3 className="text-lg text-indigo-600 font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                📚 Current Library ({acronyms.length} acronyms)
              </h3>
              {acronyms.length === 0 ? (
                <p className="text-cosmic-muted text-sm">No acronyms uploaded yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto text-sm space-y-2">
                  {acronyms.map((a, i) => (
                    <div key={a.id || i} className="flex gap-4 py-2 border-b border-cosmic-surface/30">
                      <span className="text-indigo-600 font-bold w-24 shrink-0">{a.acronym}</span>
                      <span className="text-cosmic-text font-semibold flex-1">{a.breakdown}</span>
                      <span className="text-cosmic-muted flex-2">{a.meaning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card-soft">
              <h2 className="text-lg text-indigo-600 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                👤 Registered Users ({users.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-cosmic-muted text-left border-b-2 border-cosmic-surface">
                      <th className="py-2">Username</th>
                      <th>Name</th>
                      <th>School</th>
                      <th>Grade</th>
                      <th>Group</th>
                      <th>Points</th>
                      <th>Quizzes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-cosmic-surface/30">
                        <td className="py-2 font-bold text-indigo-600">{u.username}</td>
                        <td>{u.fullName}</td>
                        <td>{u.school}</td>
                        <td>{u.grade}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            u.studyGroup === 'Gamified'
                              ? 'bg-cosmic-blue/20 text-cosmic-blue'
                              : 'bg-cosmic-purple/20 text-cosmic-purple-light'
                          }`}>
                            {u.studyGroup}
                          </span>
                        </td>
                        <td className="text-cosmic-blue font-bold">{u.points || 0}</td>
                        <td>{u.quizzesTaken || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-soft text-center">
                <p className="text-cosmic-muted text-sm">Manual Group Avg</p>
                <p className="text-4xl font-bold text-cosmic-purple-light" style={{ fontFamily: 'var(--font-heading)' }}>{avgManual}%</p>
                <p className="text-cosmic-muted text-xs">{manualResults.length} results</p>
              </div>
              <div className="card-soft text-center">
                <p className="text-cosmic-muted text-sm">Gamified Group Avg</p>
                <p className="text-4xl font-bold text-cosmic-blue" style={{ fontFamily: 'var(--font-heading)' }}>{avgGamified}%</p>
                <p className="text-cosmic-muted text-xs">{gamifiedResults.length} results</p>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="card-soft">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  📊 AI Analysis
                </h2>
                <button
                  onClick={consultGemini}
                  disabled={aiLoading || results.length === 0}
                  className="btn-soft btn-soft-blue text-sm"
                >
                  {aiLoading ? '🔄 Thinking...' : '✨ Consult Gemini'}
                </button>
              </div>
              {aiSummary ? (
                <div className="bg-cosmic-bg rounded-xl p-4 text-sm whitespace-pre-wrap">
                  {aiSummary}
                </div>
              ) : (
                <p className="text-cosmic-muted text-sm">
                  {results.length === 0
                    ? 'No results yet. Students need to take quizzes first!'
                    : 'Click "Consult Gemini" to generate an AI analysis comparing study groups.'}
                </p>
              )}
            </div>

            {/* Raw Results */}
            <div className="card-soft">
              <h2 className="text-lg text-indigo-600 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                📋 Raw Results ({results.length})
              </h2>
              <div className="max-h-64 overflow-y-auto text-xs space-y-1">
                {results.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-1 border-b border-cosmic-surface/30">
                    <span className="font-bold text-indigo-600 w-20">{r.username}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      r.studyGroup === 'Gamified' ? 'bg-cosmic-blue/20 text-cosmic-blue' : 'bg-cosmic-purple/20 text-cosmic-purple-light'
                    }`}>{r.studyGroup}</span>
                    <span className="text-cosmic-text">{r.score}/{r.total} ({r.percentage}%)</span>
                    <span className="text-cosmic-muted">{r.timeUsed}s</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Moderation Tab */}
        {tab === 'moderation' && (
          <motion.div key="moderation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Scan Controls */}
            <div className="card-soft">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg text-indigo-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                    🛡️ Chat Moderation
                  </h2>
                  <p className="text-cosmic-muted text-xs">
                    {lastScanTime ? `Last scan: ${lastScanTime}` : 'No scans yet'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setModerating(true);
                    setFlaggedMessages([]);
                    try {
                      // Fetch latest chat messages
                      const q = query(collection(db, 'chat_messages'), orderBy('timestamp', 'asc'), limit(100));
                      const snap = await getDocs(q);
                      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                      setChatMessages(msgs);

                      if (msgs.length === 0) {
                        setModerating(false);
                        setLastScanTime(new Date().toLocaleTimeString());
                        return;
                      }

                      // Send to AI for moderation (client-side)
                      const flagged = await moderateChatAI(msgs);
                      setFlaggedMessages(flagged);

                      // Save flags to Firestore
                      for (const flag of flagged) {
                        await addDoc(collection(db, 'chat_flags'), {
                          ...flag,
                          flaggedAt: serverTimestamp()
                        });
                      }

                      setLastScanTime(new Date().toLocaleTimeString());
                    } catch (err) {
                      console.error('Moderation error:', err);
                      alert('Moderation failed. Please try again.');
                    }
                    setModerating(false);
                  }}
                  disabled={moderating}
                  className="btn-soft btn-soft-blue text-sm"
                >
                  {moderating ? '🔄 Scanning...' : '🔍 Scan Chat'}
                </button>
              </div>

              {moderating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-2xl bg-cosmic-surface/50 border-2 border-cosmic-purple/30"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="text-2xl"
                    >🛡️</motion.div>
                    <div>
                      <p className="font-bold text-sm text-cosmic-text">AI is scanning chat messages...</p>
                      <p className="text-cosmic-muted text-xs">Checking for inappropriate content</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {!moderating && lastScanTime && (
                <div className="text-center py-2">
                  <p className="text-sm font-bold text-cosmic-text">
                    {chatMessages.length} messages scanned · <span className={flaggedMessages.length > 0 ? 'text-red-500' : 'text-green-600'}>{flaggedMessages.length} flagged</span>
                  </p>
                </div>
              )}
            </div>

            {/* Flagged Messages */}
            {flaggedMessages.length > 0 && (
              <div className="card-soft">
                <h3 className="text-lg text-red-500 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                  ⚠️ Flagged Messages ({flaggedMessages.length})
                </h3>
                <div className="space-y-3">
                  {flaggedMessages.map((flag, i) => (
                    <motion.div
                      key={flag.messageId || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-xl border-2 border-red-200 bg-red-50/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar avatar={flag.avatar} size={24} />
                            <span className="font-bold text-sm text-cosmic-text">{flag.fullName || flag.username}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">
                              {flag.reason}
                            </span>
                          </div>
                          <p className="text-sm text-cosmic-text bg-white/60 px-3 py-2 rounded-lg border border-red-100">
                            "{flag.text}"
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={async () => {
                              if (flag.messageId) {
                                try {
                                  await deleteDoc(doc(db, 'chat_messages', flag.messageId));
                                  setFlaggedMessages(prev => prev.filter(f => f.messageId !== flag.messageId));
                                } catch (err) { console.error('Delete error:', err); }
                              }
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                          <button
                            onClick={async () => {
                              // Find the user to ban
                              let usernameToban = flag.username;
                              
                              // If username is missing, look up from the chat message
                              if (!usernameToban && flag.messageId) {
                                try {
                                  const msgDoc = await getDoc(doc(db, 'chat_messages', flag.messageId));
                                  if (msgDoc.exists()) {
                                    usernameToban = msgDoc.data().username;
                                  }
                                } catch (e) { console.error('Lookup error:', e); }
                              }

                              if (!usernameToban) {
                                alert('Could not find user to ban.');
                                return;
                              }

                              if (!window.confirm(`Ban user "${flag.fullName || usernameToban}"? They will not be able to log in.`)) return;
                              try {
                                const q = query(collection(db, 'users'), where('username', '==', usernameToban));
                                const snap = await getDocs(q);
                                if (!snap.empty) {
                                  await updateDoc(snap.docs[0].ref, { banned: true });
                                  if (flag.messageId) await deleteDoc(doc(db, 'chat_messages', flag.messageId));
                                  setFlaggedMessages(prev => prev.filter(f => f.messageId !== flag.messageId));
                                  alert(`${flag.fullName || usernameToban} has been banned.`);
                                } else {
                                  alert('User not found in database.');
                                }
                              } catch (err) {
                                console.error('Ban error:', err);
                                alert('Ban failed: ' + err.message);
                              }
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                          >
                            🚫 Ban
                          </button>
                          <button
                            onClick={() => {
                              setFlaggedMessages(prev => prev.filter(f => f.messageId !== flag.messageId));
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                          >
                            ✓ Dismiss
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* All Clean */}
            {!moderating && lastScanTime && flaggedMessages.length === 0 && (
              <div className="card-soft text-center py-8">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-lg text-green-600 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  All Clear!
                </h3>
                <p className="text-cosmic-muted text-sm">No inappropriate messages found.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <GroupChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
