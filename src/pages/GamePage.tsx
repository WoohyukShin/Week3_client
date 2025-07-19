// src/pages/GamePage.tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene.ts'; // 예시 씬

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameContainer.current && !gameInstance.current) {
      // 화면 크기에 비례하여 게임 크기 설정
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const gameWidth = Math.min(screenWidth * 0.9, 1200); // 최대 1200px
      const gameHeight = Math.min(screenHeight * 0.9, 800); // 최대 800px

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
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };
      gameInstance.current = new Phaser.Game(config);
    }

    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div ref={gameContainer} />
      {
        // 나중에 채팅창 추가?
      }
    </div>
  );
};

export default GamePage;
