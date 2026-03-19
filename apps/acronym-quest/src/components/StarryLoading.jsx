import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function StarryLoading() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate lots of stars to "fill up" the screen
    const newStars = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage 
      y: Math.random() * 100,
      delay: Math.random() * 1.5, // Appear rapidly over 1.5 seconds
      duration: Math.random() * 1.5 + 1.5,
      scale: Math.random() * 1.2 + 0.6,
      icon: Math.random() > 0.6 ? '⭐' : '✨'
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-md overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          initial={{ opacity: 0, scale: 0, rotate: -45 }}
          animate={{ 
            opacity: [0, 1, 0.7, 1],
            scale: [0, star.scale, star.scale * 0.9, star.scale],
            rotate: 0
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            opacity: { duration: star.duration * 2, repeat: Infinity, repeatType: 'reverse' },
            scale: { duration: star.duration * 2, repeat: Infinity, repeatType: 'reverse' },
            ease: "easeOut"
          }}
          className="absolute text-yellow-400 drop-shadow-sm"
          style={{ left: `${star.x}%`, top: `${star.y}%` }}
        >
          {star.icon}
        </motion.div>
      ))}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl mb-4 drop-shadow-xl"
        >
          🌟
        </motion.div>
        <h2 className="text-3xl text-indigo-600 font-bold bg-white/95 px-8 py-4 rounded-3xl shadow-xl border-4 border-indigo-100" style={{ fontFamily: 'var(--font-heading)' }}>
          Loading...
        </h2>
      </motion.div>
    </div>
  );
}
