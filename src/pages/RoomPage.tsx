// src/pages/RoomPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

// 임시 타입 정의
interface Player {
  socketId: string;
  username: string;
}

interface RoomState {
  roomId: string;
  hostId: string;
  players: Player[];
}

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const { username } = useAuth();
  const navigate = useNavigate();
  const isHost = true; // roomState?.hostId === socketService.socket?.id;

  // before backend
  useEffect(() => {
    // Mock room state
    setRoomState({
      roomId: roomId!,
      hostId: 'mock_host_id',
      players: [
        { socketId: 'mock_host_id', username: username || 'Host' },
        { socketId: 'mock_player_id', username: 'Player 2' },
      ],
    });
  }, [roomId, username]);

  const handleStartGame = () => {
    navigate(`/game/${roomId}`);
  };
  /*
  useEffect(() => {
    // 방 상태 업데이트 리스너
    socketService.on('roomStateUpdate', (newRoomState: RoomState) => {
      setRoomState(newRoomState);
    });

    // 다른 플레이어가 참가했을 때
    socketService.on('playerJoined', (newRoomState: RoomState) => {
      setRoomState(newRoomState);
    });

    // 다른 플레이어가 나갔을 때
    socketService.on('playerLeft', (newRoomState: RoomState) => {
      setRoomState(newRoomState);
    });

    // 게임 시작 신호를 받으면 게임 페이지로 이동
    socketService.on('gameStarted', () => {
      navigate(`/game/${roomId}`);
    });

    // 컴포넌트 언마운트 시 현재 방 상태 요청 또는 정리 로직 추가 가능
    // socketService.emit('getRoomState', roomId);

    return () => {
      // 이벤트 리스너 정리
    };
  }, [roomId, navigate]);

  const handleStartGame = () => {
    if (isHost) {
      socketService.emit('startGame', { roomId });
    }
  };
  */

  if (!roomState) {
    return <div>Loading room...</div>;
  }

  return (
    <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>
      <h1>Room: {roomState.roomId}</h1>
      <h2>Players:</h2>
      <ul>
        {roomState.players.map((player) => (
          <li key={player.socketId}>
            {player.username} {player.socketId === roomState.hostId ? '(Host)' : ''}
          </li>
        ))}
      </ul>
      {isHost && <button onClick={handleStartGame}>Start Game</button>}
    </div>
  );
};

export default RoomPage;
