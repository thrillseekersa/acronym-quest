import React from 'react';
import { useGameState } from '../context/GameStateContext';

export default function HeartBar() {
  const { hearts } = useGameState();

  const MaxHearts = 3;

  return (
    <div style={styles.container}>
      {[...Array(MaxHearts)].map((_, index) => (
        <span 
          key={index} 
          style={{
            ...styles.heart, 
            opacity: index < hearts ? 1 : 0.3,
            filter: index < hearts ? 'none' : 'grayscale(100%)'
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
    width: 'fit-content'
  },
  heart: {
    fontSize: '24px',
    imageRendering: 'pixelated', // Minecraft-style sharp edges for emojis if supported
    textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
  }
};
