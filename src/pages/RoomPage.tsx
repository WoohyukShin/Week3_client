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

    if (!socketService.socket?.connected) {
      socketService.connect();
    }

    socketService.on('roomState', (newRoomState: RoomState) => {
      setRoomState(newRoomState);
      setIsLoading(false);
    });

    socketService.on('playerJoined', (newRoomState: RoomState) => {
      setRoomState(newRoomState);
    });

    socketService.on('playerLeft', () => {
      socketService.emit('getRoomState', {});
    });

    socketService.on('gameStarted', () => {
      navigate(`/game/${roomId}`);
    });

    socketService.on('error', (error) => {
      setError(error.message || '방에서 오류가 발생했습니다.');
    });

    socketService.emit('getRoomState', {});

    return () => {
      socketService.off('roomState');
      socketService.off('playerJoined');
      socketService.off('playerLeft');
      socketService.off('gameStarted');
      socketService.off('error');
    };
  }, [roomId, navigate]);

  const handleStartGame = () => {
    if (roomState && roomState.hostId === socketService.socket?.id && !roomState.isGameStarted) {
      socketService.emit('startGame', {});
    }
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    navigate('/');
  };

  if (isLoading) {
    return <div className="room-loading">Loading room...</div>;
  }

  if (error) {
    return (
      <div className="room-error">
        <div>{error}</div>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="room-error">
        <div>방을 찾을 수 없습니다.</div>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  const isHost = roomState.hostId === socketService.socket?.id;

  return (
    <div className="room-page-container">
      <div className="room-background" />

      <div className="room-card">
        <h1>Room : {roomState.roomId}</h1>
        <h2>Current Players ({roomState.players.length})</h2>
        <p>Host is {roomState.players.find(p => p.socketId === roomState.hostId)?.username || 'someone'}</p>

        <ul className="player-list">
          {roomState.players.map((player) => (
            <li key={player.socketId}>
              {player.username}
            </li>
          ))}
        </ul>

        <div className="button-group">
          <button onClick={handleLeaveRoom} className="room-btn leave-btn">Leave Room</button>
          {isHost && !roomState.isGameStarted && (
            <button onClick={handleStartGame} className="room-btn start-btn">Start Game</button>
          )}
        </div>

        {roomState.isGameStarted && (
          <div className="game-starting-text">🎮 Game is starting...</div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
