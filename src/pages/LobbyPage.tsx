// src/pages/LobbyPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import './LobbyPage.css';

interface Room {
  roomId: string;
  roomName: string;
  host: string;
}

const LobbyPage = () => {
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  useEffect(() => {
    socketService.on('connect', () => setError(''));
    socketService.on('connect_error', () => setError('서버 연결에 실패했습니다.'));

    socketService.on('roomCreated', (room: any) => navigate(`/room/${room.roomId}`));
    socketService.on('joinedRoom', (room: any) => navigate(`/room/${room.roomId}`));
    socketService.on('roomList', (roomList: any) => setRooms(roomList));
    socketService.on('error', (error: any) => {
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
      setIsLoading(false);
    });

    socketService.emit('getRoomList', {});

    return () => {
      socketService.off('roomCreated');
      socketService.off('joinedRoom');
      socketService.off('roomList');
      socketService.off('error');
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) return setError('방 이름을 입력해주세요.');
    if (!username) return setError('사용자 이름이 없습니다.');
    setIsLoading(true);
    setError('');
    console.log('📤 프론트에서 createRoom emit 요청 보냄!', { username, roomName });
    socketService.emit('createRoom', { username, roomName });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!username) return setError('사용자 이름이 없습니다.');
    setIsLoading(true);
    setError('');
    socketService.emit('joinRoom', { username, roomId });
  };

  return (
    <div className="lobby-page">
      <div className="lobby-background" />

      <div className="top-bar">
  <button className="icon-button" onClick={() => navigate('/ranking')}>랭킹 보기</button>
  <button className="icon-button" onClick={() => logout()}>로그아웃</button>
</div>

<div className="lobby-card">
  <div className="card-header">
    <div className="create-room-group">
      <input
        type="text"
        placeholder="방 이름"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        disabled={isLoading}
        className="lobby-input"
      />
      <button onClick={handleCreateRoom} disabled={isLoading} className="lobby-btn">
        {isLoading ? '...' : '만들기'}
      </button>
    </div>
  </div>

  <div className="card-body">
    <h1 className="welcome-text">환영합니다, <b>{username}</b>!</h1>
    {error && <div className="error-text">{error}</div>}

    <div className="room-list">
      {rooms.length === 0 ? (
        <p>아직 생성된 방이 없습니다.</p>
      ) : (
        rooms.map((room) => (
          <div key={room.roomId} className="room-row">
  <span className="room-name">{room.roomName}</span>
  <button onClick={() => handleJoinRoom(room.roomId)} className="lobby-btn join">
    입장
  </button>
</div>

        ))
      )}
    </div>
  </div>
</div>
    </div>
  );
}

export default LobbyPage;