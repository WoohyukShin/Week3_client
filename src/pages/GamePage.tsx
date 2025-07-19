// src/pages/GamePage.tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene.ts'; // 예시 씬

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameContainer.current && !gameInstance.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 1200,  // 800에서 1200으로 확대
        height: 800,  // 600에서 800으로 확대
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
