// src/pages/GamePage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene.ts';
import ModalTab from '../components/ModalTab';
import { SKILL_INFO } from '../constants/skills';
import ResultModal from '../components/ResultModal';
import socketService from '../services/socket';
import './GamePage.css';

const gameWidth = 1200;
const gameHeight = 800;

// GamePage.tsx 상단 생략...

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const initialTotalCount = location.state?.totalCount || 0;
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillName, setSkillName] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [okClicked, setOkClicked] = useState(false);

  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [commitCount, setCommitCount] = useState(0);
  const [skillUsed, setSkillUsed] = useState('');
  const [gameTime, setGameTime] = useState('00:00');
  const [showResultModal, setShowResultModal] = useState(false);

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

    const handleGameEnded = (data: {
      winnerSocketId: string;
      commitCount: number;
      skill: string;
      time: string;
    }) => {
      console.log('[gameEnded received]', data);
      const isWinner = data.winnerSocketId === socketService.socket?.id;
      console.log('[~ isWinner]', isWinner);
      setResult(isWinner ? 'win' : 'lose');
      setCommitCount(data.commitCount);
      setSkillUsed(data.skill);
      setGameTime(data.time);
      setShowResultModal(true);
    };

    socketService.on('gameEnded', handleGameEnded);

    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
      socketService.off('gameEnded', handleGameEnded);
    };
  }, [navigate]);

  useEffect(() => {
    console.log('[result changed]', result);
  }, [result]);

  useEffect(() => {
    socketService.emit('getGameState', {});
  }, []);

  useEffect(() => {
    const handleSkillAssigned = ({ skill }: any) => {
      setSkillName(skill);
      setShowSkillModal(true);
      setOkClicked(false);
    };
    const handleSkillReadyCount = ({ ready, total }: any) => {
      setReadyCount(ready);
      setTotalCount(total);
    };
    const handleAllSkillReady = () => {
      setShowSkillModal(false);
    };
    socketService.registerSkillAssignedHandler(handleSkillAssigned);
    socketService.registerSkillReadyCountHandler(handleSkillReadyCount);
    socketService.registerAllSkillReadyHandler(handleAllSkillReady);
    return () => {
      socketService.unregisterSkillAssignedHandler(handleSkillAssigned);
      socketService.unregisterSkillReadyCountHandler(handleSkillReadyCount);
      socketService.unregisterAllSkillReadyHandler(handleAllSkillReady);
    };
  }, []);

  useEffect(() => {
    socketService.emit('gameReady', {});
  }, []);

  const handleOk = () => {
    if (!okClicked) {
      socketService.emit('skillReady', {});
      setOkClicked(true);
    }
  };

  const skillInfo =
    skillName && (SKILL_INFO as any)[skillName as keyof typeof SKILL_INFO]
      ? (SKILL_INFO as any)[skillName as keyof typeof SKILL_INFO]
      : null;

  useEffect(() => {
    if (!showSkillModal && gameInstance.current) {
      try {
        const scene = (gameInstance.current.scene.scenes[0] as any);
        if (scene?.bgmAudio && scene.bgmAudio.paused) {
          scene.bgmAudio.currentTime = 0;
          scene.bgmAudio.play().catch(() => {});
        }
      } catch (e) {}
    }
  }, [showSkillModal]);

  useEffect(() => {
    if (showResultModal && gameInstance.current) {
      try {
        const scene = (gameInstance.current.scene.scenes[0] as any);
        if (scene?.bgmAudio && !scene.bgmAudio.paused) {
          scene.bgmAudio.pause();
          scene.bgmAudio.currentTime = 0;
        }
      } catch (e) {}
    }
  }, [showResultModal]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', position: 'relative' }}>
      <ModalTab
        visible={showSkillModal}
        title={skillInfo?.name || ''}
        description={skillInfo?.description || ''}
        image={skillInfo?.image || ''}
        okText="OK"
        onOk={handleOk}
        countText={`${readyCount} / ${totalCount}`}
        skillName={skillName || undefined}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      />
      <div ref={gameContainer} style={{ width: gameWidth, height: gameHeight }} />
      
      <ResultModal
        visible={showResultModal}
        result={result || 'lose'}
        commitCount={commitCount}
        skillName={skillUsed}
        timeTaken={gameTime}
        onExit={() => {
          try {
            (gameInstance.current?.scene.scenes[0] as any)?.shutdown?.();
          } catch (e) {}
          try {
            gameInstance.current?.destroy(true);
          } catch (e) {}
          gameInstance.current = null;
          navigate('/lobby');
        }}
      />
    </div>
  );
};

export default GamePage;
