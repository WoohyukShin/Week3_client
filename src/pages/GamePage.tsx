// src/pages/GamePage.tsx
import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene.ts'; // 예시 씬
import ModalTab from '../components/ModalTab';
import { SKILL_INFO } from '../constants/skills';
import socket from '../services/socket';

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillName, setSkillName] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [okClicked, setOkClicked] = useState(false);

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

  // 소켓 연결 및 skill/ready 이벤트 처리
  useEffect(() => {
    console.log('[DEBUG] GamePage_tsx.useEffect : connecting socket...');
    socket.connect();
    // 스킬 할당 받으면 모달 띄움
    socket.on('skillAssigned', ({ skill }) => {
      console.log('[DEBUG] GamePage_tsx.useEffect : skillAssigned:', skill);
      setSkillName(skill);
      setShowSkillModal(true);
      setOkClicked(false);
    });
    // ready 인원수 업데이트
    socket.on('skillReadyCount', ({ ready, total }) => {
      console.log('[DEBUG] GamePage_tsx.useEffect : skillReadyCount:', ready, total);
      setReadyCount(ready);
      setTotalCount(total);
    });
    // 모든 인원이 OK 누르면 모달 닫기
    socket.on('allSkillReady', () => {
      console.log('[DEBUG] GamePage_tsx.useEffect : allSkillReady');
      setShowSkillModal(false);
    });
    return () => {
      socket.off('skillAssigned');
      socket.off('skillReadyCount');
      socket.off('allSkillReady');
    };
  }, []);

  useEffect(() => {
    console.log('[DEBUG] GamePage_tsx.useEffect : showSkillModal:', showSkillModal, 'skillName:', skillName);
  }, [showSkillModal, skillName]);

  // OK 버튼 클릭
  const handleOk = () => {
    if (!okClicked) {
      socket.emit('skillReady', {});
      setOkClicked(true);
    }
  };

  // 스킬 정보
  const skillInfo = skillName && (SKILL_INFO as any)[skillName as keyof typeof SKILL_INFO] ?
    (SKILL_INFO as any)[skillName as keyof typeof SKILL_INFO] : null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div ref={gameContainer} />
      <ModalTab
        visible={showSkillModal}
        title={skillInfo?.name || ''}
        description={skillInfo?.description || ''}
        image={skillInfo?.image || ''}
        okText="OK"
        onOk={handleOk}
        countText={`${readyCount} / ${totalCount}`}
      />
    </div>
  );
};

export default GamePage;
