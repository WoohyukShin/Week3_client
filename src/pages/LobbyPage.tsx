// src/pages/LobbyPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import { getRanking } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './LobbyPage.css';

interface Ranking {
  username: string;
  score: number;
}

const LobbyPage = () => {
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showRanking, setShowRanking] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  useEffect(() => {
    // 컴포넌트 마운트 시 소켓 연결
    socketService.connect();
    
    // 소켓 연결 상태 리스너
    socketService.on('connect', () => {
      console.log('Connected to server');
      setError('');
    });

    socketService.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('서버 연결에 실패했습니다.');
    });

    // 방 생성 성공 리스너
    socketService.on('roomCreated', (room) => {
      console.log('Room created:', room);
      navigate(`/room/${room.roomId}`);
    });

    // 방 참가 성공 리스너
    socketService.on('joinedRoom', (room) => {
      console.log('Joined room:', room);
      navigate(`/room/${room.roomId}`);
    });

    // 에러 리스너
    socketService.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
      setIsLoading(false);
    });

    return () => {
      // 컴포넌트 언마운트 시 이벤트 리스너 정리
      socketService.off('roomCreated');
      socketService.off('joinedRoom');
      socketService.off('error');
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError('방 이름을 입력해주세요.');
      return;
    }
    if (!username) {
      setError('사용자 이름이 없습니다.');
      return;
    }

    setIsLoading(true);
    setError('');
    socketService.emit('createRoom', { username });
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('방 ID를 입력해주세요.');
      return;
    }
    if (!username) {
      setError('사용자 이름이 없습니다.');
      return;
    }

    setIsLoading(true);
    setError('');
    socketService.emit('joinRoom', { username, roomId: joinRoomId });
  };

return (
  <div className="page-container">
    <div className="lobby-background" />

    <div className="top-bar">
      <button className="icon-button" onClick={() => navigate('/ranking')}>View Rankings</button>
      <button className="icon-button" onClick={logout}>Logout</button>
    </div>

    <div className="lobby-card">
      <h1 style={{ color: '#000000ff' }}>Welcome, {username}!</h1>

      {error && <div className="error-text">{error}</div>}

      <div className="form-section">
        <h2>Create Room</h2>
        <div className="form-group">
          <input
            type="text"
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            disabled={isLoading}
            className="lobby-input"
          />
          <button onClick={handleCreateRoom} disabled={isLoading} className="lobby-btn">
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div className="form-section">
        <h2>Join Room</h2>
        <div className="form-group">
          <input
            type="text"
            placeholder="Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            disabled={isLoading}
            className="lobby-input"
          />
          <button onClick={handleJoinRoom} disabled={isLoading} className="lobby-btn join">
            {isLoading ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

export default LobbyPage;
