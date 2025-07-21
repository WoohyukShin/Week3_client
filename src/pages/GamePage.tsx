// src/pages/GamePage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 추가
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene.ts';
import socketService from '../services/socket'; // 소켓 서비스 import
import './GamePage.css';

const gameWidth = 800;
const gameHeight = 600;

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate(); // 네비게이션 사용

  useEffect(() => {
    if (gameContainer.current && !gameInstance.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: gameWidth,
        height: gameHeight,
        parent: gameContainer.current,
        scene: [GameScene],
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
          },
        },
        backgroundColor: '#000000',
      };
      gameInstance.current = new Phaser.Game(config);
    }

    // ✅ 게임 종료 시 로비로 이동
    const handleGameEnded = (data: any) => {
      console.log('👋 게임 종료!', data);
      navigate('/lobby');
    };

    socketService.on('gameEnded', handleGameEnded);

    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
      socketService.off('gameEnded');
    };
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div ref={gameContainer} />
    </div>
  );
};

export default GamePage;
