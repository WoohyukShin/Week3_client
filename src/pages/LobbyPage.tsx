// src/pages/LobbyPage.tsx
import React, { useState } from 'react';
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
  const navigate = useNavigate();
  const { username } = useAuth();

  // before backend
  const handleCreateRoom = () => {
    if (roomName && username) {
      navigate(`/room/mock_room_id`);
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId && username) {
      navigate(`/room/${joinRoomId}`);
    }
  };

  const handleShowRanking = async () => {
    if (!showRanking) {
      // Mock ranking data
      setRankings([
        { username: 'player1', score: 100 },
        { username: 'player2', score: 90 },
        { username: 'player3', score: 80 },
      ]);
    }
    setShowRanking(!showRanking);
  };
  /*
  const handleCreateRoom = () => {
    if (roomName && username) {
      socketService.connect();
      socketService.emit('createRoom', { username, roomName });
      // 'roomCreated' 이벤트를 리스닝하여 방으로 이동
      socketService.on('roomCreated', (room) => {
        navigate(`/room/${room.roomId}`);
      });
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId && username) {
      socketService.connect();
      socketService.emit('joinRoom', { username, roomId: joinRoomId });
      // 'joinedRoom' 이벤트를 리스닝하여 방으로 이동
      socketService.on('joinedRoom', (room) => {
        navigate(`/room/${room.roomId}`);
      });
    }
  };

  const handleShowRanking = async () => {
    if (!showRanking) {
      try {
        const { data } = await getRanking();
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch ranking', error);
      }
    }
    setShowRanking(!showRanking);
  };
  */

  return (
    <div style={{ color: 'white', textAlign: 'center', paddingTop: '50px' }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }} onClick={handleShowRanking}>
        🏆
      </div>
      
      <h1>Lobby</h1>
      <p>Welcome, {username}!</p>

      <div>
        <h2>Create Room</h2>
        <input 
          type="text" 
          placeholder="Room Name" 
          value={roomName} 
          onChange={(e) => setRoomName(e.target.value)} 
        />
        <button onClick={handleCreateRoom}>Create</button>
      </div>

      <div>
        <h2>Join Room</h2>
        <input 
          type="text" 
          placeholder="Room ID" 
          value={joinRoomId} 
          onChange={(e) => setJoinRoomId(e.target.value)} 
        />
        <button onClick={handleJoinRoom}>Join</button>
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
