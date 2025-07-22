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
  const [showLightEffect, setShowLightEffect] = useState(false);
  const [showBumpercarBanner, setShowBumpercarBanner] = useState(false);
const [lastSkillUser, setLastSkillUser] = useState('');

  const [skillUsages, setSkillUsages] = useState({
    bumpercar: 1,
    shotgun: 2,
    coffee: Infinity,
    game: Infinity,
    exercise: Infinity,
  });

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

      // 제한된 스킬은 사용 횟수 초기 설정
      if (skill === 'bumpercar') setSkillUsageLeft(1);
      else if (skill === 'shotgun') setSkillUsageLeft(2);
      else setSkillUsageLeft(null);
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
      if (by === socketService.socket?.id) {
        // 제한된 스킬일 경우 별도로 관리
        if (skill === skillName && skillUsageLeft !== null) {
          setSkillUsageLeft(prev => (prev !== null ? prev - 1 : null));
        }

        // ✅ skillUsages 갱신
        setSkillUsages(prev => {
          const current = prev[skill as keyof typeof prev];
          if (current === Infinity) return prev;
          return {
            ...prev,
            [skill]: Math.max(0, (current as number) - 1),
          };
        });

        // 쿨타임 (예: bumpercar만)
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

        if (skill === 'bumpercar') {
  setShowBumpercarBanner(true);
  setLastSkillUser(by);
  setShowLightEffect(true); // 💡 빛 연출 시작
  setTimeout(() => {
    setShowBumpercarBanner(false);
    setShowLightEffect(false); // 💡 2초 뒤 사라짐
  }, 2000);
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
{skillName && (
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
      lineHeight: '1.6',
    }}
  >
    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>내 스킬 현황</div>
    <div>
      {SKILL_INFO[skillName]?.name || skillName}:{' '}
      {skillUsages[skillName] === Infinity ? '∞' : `${skillUsages[skillName]}회`}
    </div>


{showLightEffect && (
  <div className="light-effect" />
)}


  </div>

  
)}
      </div>
  );
};

export default GamePage;