// src/pages/RoomPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
// import { useAuth } from '../contexts/AuthContext';

interface Player {
  socketId: string;
  username: string;
}

interface RoomState {
  roomId: string;
  hostId: string;
  players: Player[];
  isGameStarted: boolean;
}

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // const { username } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) {
      setError('방 ID가 없습니다.');
      return;
    }

    // 소켓 연결 확인
    if (!socketService.socket?.connected) {
      socketService.connect();
    }

    // 방 상태 업데이트 리스너
    socketService.on('roomState', (newRoomState: RoomState) => {
      console.log('Room state updated:', newRoomState);
      setRoomState(newRoomState);
      setIsLoading(false);
    });

    // 다른 플레이어가 참가했을 때
    socketService.on('playerJoined', (newRoomState: RoomState) => {
      console.log('Player joined:', newRoomState);
      setRoomState(newRoomState);
    });

    // 다른 플레이어가 나갔을 때
    socketService.on('playerLeft', (data: any) => {
      console.log('Player left:', data);
          // 방 상태 다시 요청
    socketService.emit('getRoomState', {});
    });

    // 게임 시작 신호를 받으면 게임 페이지로 이동
    socketService.on('gameStarted', (roomState: RoomState) => {
      console.log('Game started:', roomState);
      navigate(`/game/${roomId}`);
    });

    // 에러 리스너
    socketService.on('error', (error) => {
      console.error('Room error:', error);
      setError(error.message || '방에서 오류가 발생했습니다.');
    });

    // 방 상태 요청
    socketService.emit('getRoomState', {});

    return () => {
      // 이벤트 리스너 정리
      socketService.off('roomState');
      socketService.off('playerJoined');
      socketService.off('playerLeft');
      socketService.off('gameStarted');
      socketService.off('error');
    };
  }, [roomId, navigate]);

  const handleStartGame = () => {
    if (!roomState) return;
    
    const isHost = roomState.hostId === socketService.socket?.id;
    if (isHost && !roomState.isGameStarted) {
      socketService.emit('startGame', {});
    }
  };

  const handleLeaveRoom = () => {
    // 소켓 연결 해제 (서버에서 자동으로 방에서 제거됨)
    socketService.disconnect();
    navigate('/');
  };

  if (isLoading) {
    return <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>Loading room...</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>
        <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>
        <div>방을 찾을 수 없습니다.</div>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  const isHost = roomState.hostId === socketService.socket?.id;

  return (
    <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>
      <h1>Room: {roomState.roomId}</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Players ({roomState.players.length})</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
        {roomState.players.map((player) => (
            <li key={player.socketId} style={{ margin: '5px 0' }}>
              {player.username} {player.socketId === roomState.hostId ? '👑 (Host)' : ''}
          </li>
        ))}
      </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {isHost && !roomState.isGameStarted && (
          <button 
            onClick={handleStartGame}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Game
          </button>
        )}
        
        {roomState.isGameStarted && (
          <div style={{ color: '#FFD700' }}>
            🎮 Game is starting...
          </div>
        )}
      </div>

      <button 
        onClick={handleLeaveRoom}
        style={{ 
          padding: '8px 16px', 
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Leave Room
      </button>
    </div>
  );
};

export default RoomPage;
