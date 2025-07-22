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

// ✅ 테스트용 모달 페이지들 (개발 확인용)
import TestModalPage from './pages/TestModalPage';
import TestResultModalPage from './pages/TestResultModalPage';

function App() {
  useEffect(() => {
    if (!socketService.socket?.connected) {
      socketService.connect();
    }
  }, []);

  return (
    <Routes>
      {/* ✅ 공개 페이지 */}
      <Route path="/" element={<StartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/ranking" element={<RankingPage />} />

      {/* ✅ 보호된 페이지 (로그인 필요) */}
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

      {/* ✅ 개발 테스트용 페이지 (삭제 X) */}
      <Route path="/test-modal" element={<TestModalPage />} />
      <Route
        path="/test-result"
        element={
          <TestResultModalPage
            result="win"
            commitCount={3}
            skillName="bumpercar"
            gameTime="01:23"
            onExit={() => alert('Exit callback!')}
          />
        }
      />
    </Routes>
  );
}

export default App;
