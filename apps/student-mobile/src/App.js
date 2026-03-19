import React from 'react';
import { GameStateProvider } from './context/GameStateContext';
import HeartBar from './components/HeartBar';

export default function App() {
  return (
    <GameStateProvider>
      <div style={styles.appContainer}>
        <header style={styles.header}>
          <h1>8-Bit Study Adventure</h1>
          <HeartBar />
        </header>
        
        <main style={styles.main}>
          {/* Main game board or study tracker components will go here */}
          <GameDashboard />
        </main>
      </div>
    </GameStateProvider>
  );
}

// A simple placeholder dashboard to demonstrate context usage
import { useGameState } from './context/GameStateContext';
function GameDashboard() {
  const { coins, grade, isGameOver, loseHeart, winCoins, restartGame } = useGameState();

  if (isGameOver) {
    return (
      <div style={styles.gameOverPanel}>
        <h2>GAME OVER</h2>
        <p>You ran out of hearts!</p>
        <button onClick={restartGame} style={styles.button}>Restart Lesson</button>
      </div>
    );
  }

  return (
    <div style={styles.dashboardPanel}>
      <h2>Dashboard</h2>
      <p><strong>Grade:</strong> {grade}</p>
      <p><strong>Coins:</strong> 🟡 {coins}</p>
      
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button onClick={() => loseHeart()} style={{ ...styles.button, backgroundColor: '#ef4444' }}>
          Take Damage (-1 Heart)
        </button>
        <button onClick={() => winCoins(10)} style={{ ...styles.button, backgroundColor: '#10b981' }}>
          Answer Correctly (+10 Coins)
        </button>
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    fontFamily: '"Courier New", Courier, monospace',
    minHeight: '100vh',
    backgroundColor: '#1f2937',
    color: '#fff',
    padding: '2rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '4px solid #374151',
    paddingBottom: '1rem',
    marginBottom: '2rem'
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  dashboardPanel: {
    backgroundColor: '#374151',
    padding: '2rem',
    borderRadius: '12px',
    border: '4px solid #4b5563',
    width: '100%',
    maxWidth: '600px'
  },
  gameOverPanel: {
    backgroundColor: '#7f1d1d',
    padding: '3rem',
    borderRadius: '12px',
    border: '4px solid #ef4444',
    textAlign: 'center',
    width: '100%',
    maxWidth: '600px'
  },
  button: {
    padding: '12px 24px',
    border: '4px solid #000',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#fff'
  }
};
