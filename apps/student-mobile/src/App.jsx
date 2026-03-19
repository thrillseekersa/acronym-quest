import React, { useState, useEffect } from 'react';
import { GameStateProvider, useGameState } from './context/GameStateContext';
import HeartBar from './components/HeartBar';
import { firestore } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generateQuizFromTextbook } from './services/aiService';
import './App.css'; // Let's reuse existing CSS logic or basic mobile styling

export default function App() {
  return (
    <GameStateProvider>
      <div className="mobile-app-container">
        <header className="mobile-header">
          <h1>8-Bit Study Adventure</h1>
          <HeartBar />
        </header>
        
        <main className="mobile-main">
          <StudentDashboard />
        </main>
      </div>
    </GameStateProvider>
  );
}

function StudentDashboard() {
  const { coins, grade, isGameOver, loseHeart, winCoins, restartGame } = useGameState();
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    fetchTextbooks();
  }, []);

  const fetchTextbooks = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'textbooks'));
      const books = [];
      querySnapshot.forEach((doc) => {
        books.push({ id: doc.id, ...doc.data() });
      });
      setTextbooks(books);
    } catch (err) {
      console.error("Error fetching textbooks:", err);
    }
  };

  const handleStartQuiz = async (bookId, topic) => {
    setLoading(true);
    setQuiz(null); // Reset
    try {
      // Calls the Node.js backend to get questions from the PDF
      const questions = await generateQuizFromTextbook(bookId, topic, 'Medium');
      setQuiz(questions);
    } catch (error) {
      alert("Failed to generate quiz: " + error.message);
    }
    setLoading(false);
  };

  if (isGameOver) {
    return (
      <div className="game-over-panel">
        <h2>GAME OVER</h2>
        <p>You ran out of hearts!</p>
        <button onClick={() => { restartGame(); setQuiz(null); }} className="action-btn">Restart Lesson</button>
      </div>
    );
  }

  // Active Quiz View
  if (quiz) {
    return <ActiveQuiz quiz={quiz} onFinish={() => setQuiz(null)} loseHeart={loseHeart} winCoins={winCoins} coins={coins} />
  }

  // Dashboard View
  return (
    <div className="dashboard-panel">
      <div className="stats-row">
        <span><strong>Grade:</strong> {grade}</span>
        <span><strong>Coins:</strong> 🟡 {coins}</span>
      </div>

      <h2 style={{marginTop: '2rem'}}>Available Lessons</h2>
      {textbooks.length === 0 ? (
        <p>No textbooks assigned yet. Ask your teacher to upload some!</p>
      ) : (
        <ul className="textbook-list">
          {textbooks.map(book => (
            <li key={book.id} className="textbook-card">
              <h3>{book.fileName}</h3>
              <p>Topic: {book.topic}</p>
              <button onClick={() => handleStartQuiz(book.id, book.topic)} disabled={loading} className="action-btn">
                {loading ? 'Generating...' : 'Start Quiz'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Sub-component for taking the quiz
function ActiveQuiz({ quiz, onFinish, loseHeart, winCoins, coins }) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const question = quiz[currentQuestionIdx];

  const handleDisplayAnswer = () => {
    if (selectedOption === null) return;
    
    // Check if the selected text matches the correct answer or if the index matches
    const isCorrect = (selectedOption === question.answer) || (question.options[selectedOption] === question.answer);
    
    if (isCorrect) {
      setFeedback('correct');
      winCoins(10);
    } else {
      setFeedback('incorrect');
      loseHeart();
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < quiz.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      alert("Quiz completed!");
      onFinish();
    }
  };

  return (
    <div className="quiz-panel">
       <div className="quiz-header">
           <h3>Question {currentQuestionIdx + 1} of {quiz.length}</h3>
           <span>🟡 {coins}</span>
       </div>
       
       <p className="question-text">{question.question}</p>

       <div className="options-list">
         {question.options.map((option, idx) => (
           <label key={idx} className={`option-item ${selectedOption === idx ? 'selected' : ''}`}>
             <input 
               type="radio" 
               name="quiz-option" 
               checked={selectedOption === idx}
               onChange={() => setSelectedOption(idx)}
               disabled={feedback !== null}
             />
             {option}
           </label>
         ))}
       </div>

       {feedback && (
         <div className={`feedback-banner ${feedback}`}>
           {feedback === 'correct' ? '🎉 Correct! +10 Coins!' : '💔 Incorrect! Lost 1 Heart.'}
         </div>
       )}

       <div className="quiz-actions">
         {!feedback ? (
           <button onClick={handleDisplayAnswer} disabled={selectedOption === null} className="action-btn">Check Answer</button>
         ) : (
           <button onClick={nextQuestion} className="action-btn">Next</button>
         )}
         <button onClick={onFinish} className="action-btn secondary">Quit</button>
       </div>
    </div>
  );
}
