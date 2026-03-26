import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import ManualView from './pages/ManualView';
import GamifiedDashboard from './pages/GamifiedDashboard';
import QuizPage from './pages/QuizPage';
import AdminDashboard from './pages/AdminDashboard';
import CountdownScreen from './components/CountdownScreen';
import { useState } from 'react';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  return currentUser ? children : <Navigate to="/auth" />;
}

function StudentView() {
  const { userData } = useAuth();
  if (userData?.studyGroup === 'Gamified') return <GamifiedDashboard />;
  return <ManualView />;
}

function HomeRouter() {
  const { userData, isAdmin } = useAuth();
  if (isAdmin()) return <AdminDashboard />;
  return <StudentView />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute><HomeRouter /></ProtectedRoute>} />
          <Route path="/study" element={<ProtectedRoute><StudentView /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
