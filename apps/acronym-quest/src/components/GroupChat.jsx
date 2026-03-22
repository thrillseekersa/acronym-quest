import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';

export default function GroupChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { currentUser, userData } = useAuth();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Real-time listener for chat messages
  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'chat_messages'),
      orderBy('timestamp', 'asc'),
      limit(1000)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Chat listener error:', err);
    });

    return unsub;
  }, [isOpen]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      await addDoc(collection(db, 'chat_messages'), {
        text,
        userId: currentUser.uid,
        username: userData.username,
        fullName: userData.fullName,
        avatar: userData.avatar || '👤',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
    setSending(false);
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size (max 5MB)
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      return;
    }

    setUploading(true);
    try {
      const fileName = `chat_images/${Date.now()}_${currentUser.uid}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'chat_messages'), {
        text: '',
        imageUrl,
        userId: currentUser.uid,
        username: userData.username,
        fullName: userData.fullName,
        avatar: userData.avatar || '👤',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image. Please try again.');
    }
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function formatTime(timestamp) {
    if (!timestamp?.toDate) return '';
    const d = timestamp.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 400, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 right-4 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#FFFFFF', border: '3px solid #BBF7D0' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: '#DCFCE7' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="font-bold text-cosmic-text text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
              Study Chat
            </span>
            <span className="text-xs text-cosmic-muted bg-white/60 px-2 py-0.5 rounded-full">
              Everyone
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-cosmic-muted hover:text-cosmic-text transition-colors text-lg font-bold"
          >✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: 380, minHeight: 200, background: '#FAFAFA' }}>
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-cosmic-muted text-xs">No messages yet. Say hi to your classmates!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = msg.userId === currentUser.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                  {/* Name + Avatar (only for others) */}
                  {!isOwn && (
                    <div className="flex items-center gap-1 mb-0.5 ml-1">
                      <Avatar avatar={msg.avatar} size={18} />
                      <span className="text-[10px] font-bold text-cosmic-muted">{msg.fullName || msg.username}</span>
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-xs font-medium ${
                    isOwn
                      ? 'bg-baby-purple text-cosmic-text rounded-br-md border border-purple-200'
                      : 'bg-white text-cosmic-text rounded-bl-md border border-gray-200 shadow-sm'
                  }`}>
                    {/* Image message */}
                    {msg.imageUrl && (
                      <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={msg.imageUrl}
                          alt="Shared image"
                          className="rounded-lg max-w-full max-h-[200px] object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {msg.text && msg.text}
                    <span className={`block text-[9px] mt-1 ${isOwn ? 'text-purple-400 text-right' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Upload indicator */}
        {uploading && (
          <div className="px-3 py-1 text-center text-xs text-cosmic-muted" style={{ background: '#F0FDF4' }}>
            📸 Uploading image...
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2 flex gap-2 items-center" style={{ background: '#F0FDF4', borderTop: '2px solid rgba(0,0,0,0.05)' }}>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          {/* Image button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-lg hover:scale-110 transition-transform"
            title="Send image"
            style={{ opacity: uploading ? 0.5 : 1 }}
          >
            📷
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium outline-none"
            style={{ background: '#FFFFFF', color: 'var(--color-cosmic-text)', border: '2px solid rgba(0,0,0,0.05)' }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="btn-soft btn-soft-blue text-xs px-3 py-1"
            style={{ borderRadius: '0.75rem', boxShadow: '0 4px 0 0 #BBF7D0', background: '#DCFCE7' }}
          >
            {sending ? '⏳' : '➤'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
