import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../firebase';

const GameStateContext = createContext();

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider = ({ children }) => {
  const [hearts, setHearts] = useState(3);
  const [coins, setCoins] = useState(0);
  const [grade, setGrade] = useState('A');
  const [isGameOver, setIsGameOver] = useState(false);

  // Fetch initial user data from Firestore if authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.coins !== undefined) setCoins(data.coins);
            if (data.hearts !== undefined) setHearts(data.hearts);
            if (data.grade !== undefined) setGrade(data.grade);
          }
        } catch (error) {
          console.error("Error fetching user stats:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const loseHeart = async () => {
    if (isGameOver) return;
    
    const newHearts = Math.max(0, hearts - 1);
    setHearts(newHearts);
    
    if (newHearts === 0) {
      setIsGameOver(true);
      console.log('Game Over triggered!');
    }
    
    // Optional: save new hearts to Firestore
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, { hearts: newHearts });
      } catch (error) {
        console.error("Error saving hearts to Firestore:", error);
      }
    }
  };

  const winCoins = async (amount) => {
    if (isGameOver) return;
    
    const newCoins = coins + amount;
    setCoins(newCoins);
    
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        // Ensure the doc exists or use setDoc with merge: true if setting up
        await updateDoc(userDocRef, { coins: newCoins });
      } catch (error) {
        console.error("Error saving coins to Firestore:", error);
      }
    }
  };

  const restartGame = () => {
    setHearts(3);
    setCoins(0);
    setGrade('A');
    setIsGameOver(false);
  };

  return (
    <GameStateContext.Provider value={{
      hearts,
      coins,
      grade,
      isGameOver,
      loseHeart,
      winCoins,
      restartGame,
      setGrade
    }}>
      {children}
    </GameStateContext.Provider>
  );
};
