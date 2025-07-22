// src/pages/GamePage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Phaser from 'phaser';
import GameScene from '../phaser/scenes/GameScene';
import ModalTab from '../components/ModalTab';
import { SKILL_INFO } from '../constants/skills';
import ResultModal from '../components/ResultModal';
import socketService from '../services/socket';
import './GamePage.css';

const gameWidth = 1200;
const gameHeight = 800;

const GamePage = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const initialTotalCount = location.state?.totalCount || 0;
  const [showSkillModal, setShowSkillModal] = useState(false);

  type SkillKey = keyof typeof SKILL_INFO;
const [skillName, setSkillName] = useState<SkillKey | null>(null);

  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [okClicked, setOkClicked] = useState(false);

  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [commitCount, setCommitCount] = useState(0);
  const [skillUsed, setSkillUsed] = useState('');
  const [gameTime, setGameTime] = useState('00:00');
  const [showResultModal, setShowResultModal] = useState(false);
  const [gameStateArrived, setGameStateArrived] = useState(false);
  const gameStartedRef = useRef(false);

  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [skillUsageLeft, setSkillUsageLeft] = useState<number | null>(null);

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
      const isWinner = data.winnerSocketId === socketService.socket?.id;
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
    socketService.emit('getGameState', {});
  }, []);

  useEffect(() => {
    const handleSkillAssigned = ({ skill }: any) => {
      setSkillName(skill);
      setShowSkillModal(true);
      setOkClicked(false);

      // 스킬 사용 제한 설정
      if (skill === 'bumpercar') setSkillUsageLeft(1);
      else if (skill === 'shotgun') setSkillUsageLeft(2);
      else setSkillUsageLeft(null); // 나머지 스킬은 제한 없음
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

  useEffect(() => {
    const handleSkillUsed = ({ by, skill }: { by: string; skill: string }) => {
      if (by === socketService.socket?.id && skill === skillName) {
        if (skillUsageLeft !== null) {
          setSkillUsageLeft(prev => (prev !== null ? prev - 1 : null));
        }
        if (skill === 'bumpercar') {
          let time = 5;
          setCooldownTime(time);
          setIsCooldown(true);
          const interval = setInterval(() => {
            time -= 1;
            setCooldownTime(time);
            if (time <= 0) {
              clearInterval(interval);
              setIsCooldown(false);
            }
          }, 1000);
        }
      }
    };
    socketService.on('skillUsed', handleSkillUsed);
    return () => socketService.off('skillUsed', handleSkillUsed);
  }, [skillName, skillUsageLeft]);

  const handleOk = () => {
    if (!okClicked) {
      socketService.emit('skillReady', {});
      setOkClicked(true);
    }
  };

  const skillInfo = skillName ? SKILL_INFO[skillName as keyof typeof SKILL_INFO] : null;

  useEffect(() => {
    // 실제 게임 프레임이 돌기 시작한 뒤에만 bgm play
    if (!showSkillModal && gameStateArrived && gameInstance.current && !gameStartedRef.current) {
      try {
        const scene = (gameInstance.current.scene.scenes[0] as any);
        if (scene?.bgmAudio && scene.bgmAudio.paused) {
          scene.bgmAudio.currentTime = 0;
          scene.bgmAudio.play().catch(() => {});
          gameStartedRef.current = true;
        }
      } catch (e) {}
    }
  }, [showSkillModal, gameStateArrived]);

  useEffect(() => {
    // 게임 종료 창이 뜨는 순간 → bgm 정지
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

  // gameStateUpdate가 오면 setGameStateArrived(true)
  useEffect(() => {
    const handleGameStateUpdate = () => {
      setGameStateArrived(true);
    };
    socketService.on('gameStateUpdate', handleGameStateUpdate);
    return () => {
      socketService.off('gameStateUpdate', handleGameStateUpdate);
    };
  }, []);

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

      {isCooldown && (
        <div className="cooldown-banner-simple">
          스킬 쿨타임 중... ({cooldownTime}초 남음)
        </div>
      )}

      {/* HUD: 우측 하단 스킬 정보 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '16px',
        }}
      >
        <div>스킬: {skillName ? SKILL_INFO[skillName]?.name : '없음'}</div>
        {skillUsageLeft !== null && <div>남은 사용: {skillUsageLeft}회</div>}
        {isCooldown && <div>쿨타임: {cooldownTime}초</div>}
      </div>
    </div>
  );
};

export default GamePage;