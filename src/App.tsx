import { Routes, Route } from 'react-router-dom';
import StartPage from './pages/StartPage';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';
import RankingPage from './pages/RankingPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';
import { useEffect } from 'react';
import socketService from './services/socket';
import TestModalPage from './pages/TestModalPage';

function App() {
  useEffect(() => {
    if (!socketService.socket?.connected) {
      socketService.connect();
    }
  }, []);
  return (
<Routes>
  <>
    {/* Public Routes */}
    <Route path="/" element={<StartPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/ranking" element={<RankingPage />} />

    {/* Protected Routes */}
    <Route 
      path="/lobby" 
      element={
        <PrivateRoute>
          <LobbyPage />
        </PrivateRoute>
      } 
    />
    <Route 
      path="/room/:roomId" 
      element={
        <PrivateRoute>
          <RoomPage />
        </PrivateRoute>
      } 
    />
    <Route 
      path="/game/:roomId" 
      element={
        <PrivateRoute>
          <GamePage />
        </PrivateRoute>
      } 
    />
    <Route path="/test-modal" element={<TestModalPage />} />
  </>
</Routes>
  );
}

export default App;
