// src/pages/GamePage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene.ts';
import ModalTab from '../components/ModalTab';
import { SKILL_INFO } from '../constants/skills';
import socketService from '../services/socket';
import './GamePage.css';

const gameWidth = 800;
const gameHeight = 600;

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();

  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillName, setSkillName] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [okClicked, setOkClicked] = useState(false);

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

    // 게임 종료 시 로비로 이동
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

  // 소켓 연결 및 skill/ready 이벤트 처리
  useEffect(() => {
    console.log('[DEBUG] GamePage_tsx.useEffect : connecting socket...');
    socketService.on('skillAssigned', ({ skill }) => {
      console.log('[DEBUG] GamePage_tsx : skillAssigned:', skill);
      setSkillName(skill);
      setShowSkillModal(true);
      setOkClicked(false);
    });
    socketService.on('skillReadyCount', ({ ready, total }) => {
      console.log('[DEBUG] GamePage_tsx : skillReadyCount:', ready, total);
      setReadyCount(ready);
      setTotalCount(total);
    });
    socketService.on('allSkillReady', () => {
      console.log('[DEBUG] GamePage_tsx : allSkillReady');
      setShowSkillModal(false);
    });
    return () => {
      socketService.off('skillAssigned');
      socketService.off('skillReadyCount');
      socketService.off('allSkillReady');
    };
  }, []);

  useEffect(() => {
    console.log('[DEBUG] GamePage_tsx.useEffect : showSkillModal:', showSkillModal, 'skillName:', skillName);
  }, [showSkillModal, skillName]);

  // OK 버튼 클릭
  const handleOk = () => {
    if (!okClicked) {
      socketService.emit('skillReady', {});
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
