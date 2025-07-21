import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';
import RankingPage from './pages/RankingPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';
// import background from './assets/img/background.png';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route 
        path="/" 
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
      <Route path="/ranking" element={<RankingPage />} />
    </Routes>
  );
}

export default App;
