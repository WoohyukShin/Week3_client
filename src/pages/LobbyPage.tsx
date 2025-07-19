// src/pages/LobbyPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import { getRanking } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  const { username } = useAuth();

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

  const handleShowRanking = async () => {
    if (!showRanking) {
      try {
        const { data } = await getRanking();
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch ranking', error);
        setError('랭킹을 불러오는데 실패했습니다.');
      }
    }
    setShowRanking(!showRanking);
  };

  return (
    <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }} onClick={handleShowRanking}>
        🏆
      </div>
      
      <h1>Lobby</h1>
      <p>Welcome, {username}!</p>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div>
        <h2>Create Room</h2>
        <input 
          type="text" 
          placeholder="Room Name" 
          value={roomName} 
          onChange={(e) => setRoomName(e.target.value)} 
          disabled={isLoading}
        />
        <button onClick={handleCreateRoom} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create'}
        </button>
      </div>

      <div>
        <h2>Join Room</h2>
        <input 
          type="text" 
          placeholder="Room ID" 
          value={joinRoomId} 
          onChange={(e) => setJoinRoomId(e.target.value)} 
          disabled={isLoading}
        />
        <button onClick={handleJoinRoom} disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join'}
        </button>
      </div>

      {showRanking && (
        <div style={{ marginTop: '30px', border: '1px solid white', padding: '10px' }}>
          <h2>Ranking</h2>
          <ol>
            {rankings.map((r, index) => (
              <li key={index}>{r.username}: {r.score}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
