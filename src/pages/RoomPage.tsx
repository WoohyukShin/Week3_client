// src/pages/RoomPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import './RoomPage.css';

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
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) {
      setError('방 ID가 없습니다.');
      return;
    }

    socketService.on('roomState', (newRoomState: any) => {
      setRoomState(newRoomState);
      setIsLoading(false);
    });

    socketService.on('playerJoined', (newRoomState: any) => {
      setRoomState(newRoomState);
    });

    socketService.on('playerLeft', () => {
      socketService.emit('getRoomState', {});
    });

    socketService.on('gameStarted', () => {
      // 기존: navigate(`/game/${roomId}`);
      // 이제는 gameStart 이벤트에서만 이동
    });

    socketService.on('gameStart', () => {
      navigate(`/game/${roomId}`);
    });

    socketService.on('error', (error: any) => {
      setError(error.message || '방에서 오류가 발생했습니다.');
    });

    socketService.emit('getRoomState', {});

    return () => {
      socketService.off('roomState');
      socketService.off('playerJoined');
      socketService.off('playerLeft');
      socketService.off('gameStarted');
      socketService.off('gameStart');
      socketService.off('error');
    };
  }, [roomId, navigate]);

  const handleStartGame = () => {
    socketService.emit('startGame', {});
    // navigate(`/game/${roomId}`); // 제거
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    navigate('/lobby');
  };

  if (isLoading) {
    return <div className="room-loading">방 로딩중...</div>;
  }

  if (error) {
    return (
      <div className="room-error">
        <div>{error}</div>
        <button onClick={() => navigate('/')}>로비로 돌아가기</button>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="room-error">
        <div>방을 찾을 수 없습니다.</div>
        <button onClick={() => navigate('/lobby')}>Back to Lobby</button>
      </div>
    );
  }

  const isHost = roomState.hostId === socketService.socket?.id;

  return (
    <div className="room-page-container">
      <div className="room-background" />

      <div className="room-card">
        <h1>방 코드 : {roomState.roomId}</h1>
        <h2>입장한 학생들 ({roomState.players.length})</h2>
        <p>주최자는 {roomState.players.find(p => p.socketId === roomState.hostId)?.username || 'someone'}</p>

        <ul className="player-list">
          {roomState.players.map((player) => (
            <li key={player.socketId}>
              {player.username}
            </li>
          ))}
        </ul>

        <div className="button-group">
          <button onClick={handleLeaveRoom} className="room-btn leave-btn">방 나가기</button>
          {isHost && !roomState.isGameStarted && (
            <button onClick={handleStartGame} className="room-btn start-btn">게임 시작하기</button>
          )}
        </div>

        {roomState.isGameStarted && (
          <div className="game-starting-text">🎮 게임 시작하는 중...</div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
