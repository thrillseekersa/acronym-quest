import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TARGET_DATE = new Date('2026-03-27T00:00:00+02:00'); // March 27, midnight SAST

function getTimeLeft() {
  const now = new Date();
  const diff = TARGET_DATE - now;
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  };
}

export default function CountdownScreen({ onComplete }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft();
      if (!t) {
        clearInterval(interval);
        onComplete?.();
      }
      setTimeLeft(t);
    }, 1000);
    return () => clearInterval(interval);
  }, [onComplete]);

  // If countdown is over, don't render
  if (!timeLeft) return null;

  const blocks = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>

      {/* Animated background particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 20 + 5,
            height: Math.random() * 20 + 5,
            background: `rgba(255,255,255,${Math.random() * 0.3 + 0.1})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center z-10 px-6"
      >
        {/* Logo */}
        <motion.div
          className="text-6xl mb-4"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🚀
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-black text-white mb-2"
          style={{ fontFamily: 'var(--font-heading)', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          Acronym Quest
        </h1>

        <motion.p
          className="text-white/80 text-lg md:text-xl mb-8 font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Program starts in...
        </motion.p>

        {/* Countdown blocks */}
        <div className="flex gap-3 md:gap-5 justify-center mb-10">
          {blocks.map((block, i) => (
            <motion.div
              key={block.label}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="rounded-2xl px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px]"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                <motion.span
                  key={block.value}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl md:text-5xl font-black text-white block"
                  style={{ fontFamily: 'var(--font-heading)', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                >
                  {String(block.value).padStart(2, '0')}
                </motion.span>
              </div>
              <span className="text-white/70 text-xs md:text-sm font-bold mt-2 uppercase tracking-wider">
                {block.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Motivational text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl px-6 py-4 max-w-md mx-auto"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <p className="text-white/90 text-sm md:text-base font-medium">
            ✨ Get ready to learn acronyms, earn points, and compete with your classmates!
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
