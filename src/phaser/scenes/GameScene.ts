// src/phaser/scenes/GameScene.ts
import Phaser from 'phaser';
import socket from '../../services/socket';
import Player from '../object/Player';

interface GamePlayer {
  socketId: string;
  username: string;
  isDancing: boolean;
  isAlive: boolean;
  commitGauge: number;
  flowGauge: number;
  commitCount: number;
  skill: string | null;
  bumpercar: boolean;
  isExercising: boolean;
  hasCaffeine: boolean;
  muscleCount: number;
}

interface GameState {
  roomId: string;
  players: GamePlayer[];
  isManagerAppeared: boolean;
}

export default class GameScene extends Phaser.Scene {
  private players: Map<string, Player> = new Map();
  private localPlayerId: string = '';
  private gameState: GameState = { roomId: '', players: [], isManagerAppeared: false };
  private focusGaugeValue: number = 100;
  private focusBar!: Phaser.GameObjects.Rectangle;
  private focusBarBg!: Phaser.GameObjects.Rectangle;
  private commitBar!: Phaser.GameObjects.Rectangle;
  private commitBarBg!: Phaser.GameObjects.Rectangle;
  private playerPositions: { [key: string]: { x: number; y: number } } = {};

  // 이미지별 스케일 설정 (워터마크 제거 및 crop에 따른 조정)
  private readonly IMAGE_SCALES = {
    coding: 1.0,      // 코딩 애니메이션 기본 크기
    exercise: 1.2,    // 운동 애니메이션 20% 확대
    pkpk: 1.5,        // pkpk 애니메이션 50% 확대
    desk: 0.8,        // 책상 20% 축소
    chair: 0.7,       // 의자 30% 축소
    player: 1.0,      // 플레이어 기본 크기
    'death-image': 1.1 // 사망 이미지 10% 확대
  };

  constructor() {
    super('GameScene');
  }

  // 이미지별 스케일 계산 헬퍼 함수
  private getImageScale(imageKey: string, baseScale: number = 1.0): number {
    const imageScale = this.IMAGE_SCALES[imageKey as keyof typeof this.IMAGE_SCALES] || 1.0;
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
    
    return baseScale * imageScale * scaleFactor;
  }

  preload() {
    this.load.image('background', '/src/assets/img/game_background.jpg');
    this.load.image('chair', '/src/assets/img/chair.png');
    this.load.image('desk', '/src/assets/img/desk.png');
    
    // 스프라이트시트 로드 (프레임 크기 조정)
    this.load.spritesheet('coding', '/src/assets/img/coding.png', {
      frameWidth: 809/3,
      frameHeight: 307,
    });
    this.load.spritesheet('exercise', '/src/assets/img/exercise.png', {
      frameWidth: 1067/5,
      frameHeight: 234,
    });
    this.load.spritesheet('pkpk', '/src/assets/img/pkpk.png', {
      frameWidth: 1154/6,
      frameHeight: 216,
    });

    this.load.image('death-image', '/src/assets/img/deathplayer.png');
  }

  create() {
    this.add.image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, this.scale.height);

    // UI 설정
    this.setupUI();
    
    // 애니메이션 설정
    this.setupAnimations();
    
    // 소켓 리스너 설정
    this.setupSocketListeners();
    
    // 입력 설정
    this.setupInput();
    
    // 초기 플레이어 위치 설정
    this.setupPlayerPositions();
    
    // 모든 위치에 desk와 chair 미리 배치 (플레이어가 없어도 보이도록)
    this.setupAllDesksAndChairs();
    
    // 게임 상태 요청
    socket.emit('getGameState', {});
  }

  setupUI() {
    // 화면 크기에 비례하여 UI 크기 설정
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const uiScale = Math.min(screenWidth / 1200, screenHeight / 800); // UI 스케일 팩터
    
    const barWidth = 200 * uiScale;
    const barHeight = 20 * uiScale;
    const commitBarHeight = 15 * uiScale;
    const fontSize = Math.max(12, 14 * uiScale);
    
    // Flow Gauge
    this.focusBarBg = this.add.rectangle(20 * uiScale, 20 * uiScale, barWidth, barHeight, 0x222222).setOrigin(0, 0);
    this.focusBar = this.add.rectangle(20 * uiScale, 20 * uiScale, barWidth, barHeight, 0x00aaff).setOrigin(0, 0);
    
    // Commit Gauge
    this.commitBarBg = this.add.rectangle(20 * uiScale, 50 * uiScale, barWidth, commitBarHeight, 0x222222).setOrigin(0, 0);
    this.commitBar = this.add.rectangle(20 * uiScale, 50 * uiScale, 0, commitBarHeight, 0x00ff00).setOrigin(0, 0);
    
    // 게이지 라벨
    this.add.text((20 + barWidth + 10) * uiScale, (20 + barHeight/2) * uiScale, 'Flow', { 
      fontSize: `${fontSize}px`, 
      color: '#ffffff' 
    });
    
    this.add.text((20 + barWidth + 10) * uiScale, (50 + commitBarHeight/2) * uiScale, 'Commit', { 
      fontSize: `${fontSize}px`, 
      color: '#ffffff' 
    });
    
    // 플레이어 수 표시
    this.add.text(20 * uiScale, 80 * uiScale, 'Players: 0', { 
      fontSize: `${fontSize + 2}px`, 
      color: '#ffffff' 
    }).setName('playerCount');
  }

  setupAnimations() {
    // 코딩 애니메이션 (기본 상태)
    this.anims.create({
      key: 'coding',
      frames: this.anims.generateFrameNumbers('coding', { start: 0, end: 2 }), 
      frameRate: 6,
      repeat: -1
    });

    // 춤추기 애니메이션 (pkpk 스프라이트시트)
    this.anims.create({
      key: 'dance',
      frames: this.anims.generateFrameNumbers('pkpk', { start: 0, end: 5 }), 
      frameRate: 12,
      repeat: -1
    });

    // 운동 애니메이션 (exercise 스프라이트시트)
    this.anims.create({
      key: 'exercise',
      frames: this.anims.generateFrameNumbers('exercise', { start: 0, end: 4 }), 
      frameRate: 8,
      repeat: -1
    });



    // 운영진 등장 애니메이션 (pkpk 스프라이트시트 사용)
    this.anims.create({
      key: 'manager-appear',
      frames: this.anims.generateFrameNumbers('pkpk', { start: 0, end: 5 }), 
      frameRate: 20,
      repeat: 0
    });
  }

  setupSocketListeners() {
    // 게임 상태 업데이트
    socket.on('gameStateUpdate', (gameState: GameState) => {
      console.log('GameState Update:', gameState);
      this.updateGameState(gameState);
    });

    // 플레이어 추가
    socket.on('playerJoined', (playerData: GamePlayer) => {
      console.log('Player joined game:', playerData);
      this.addPlayer(playerData);
    });

    // 플레이어 제거
    socket.on('playerLeft', (playerData: { socketId: string }) => {
      console.log('Player left game:', playerData);
      this.removePlayer(playerData.socketId);
    });

    // 플레이어 액션
    socket.on('playerAction', (data: { socketId: string; action: string; payload?: any }) => {
      console.log('Player action:', data);
      this.handlePlayerAction(data);
    });

    // 로컬 플레이어 ID 설정
    socket.on('setLocalPlayer', (playerId: string) => {
      this.localPlayerId = playerId;
      console.log('Local player ID set:', playerId);
    });

    // === 백엔드 게임 이벤트 연동 ===
    
    // 운영진 등장
    socket.on('managerAppeared', () => {
      console.log('🚨 Manager appeared!');
      this.showManagerAppearAnimation();
    });

    // 플레이어 사망
    socket.on('playerDied', (data: { socketId: string; reason: string }) => {
      console.log(`💀 Player died: ${data.socketId}, reason: ${data.reason}`);
      this.handlePlayerDeath(data.socketId, data.reason);
    });

    // 커밋 성공
    socket.on('commitSuccess', (data: { socketId: string; commitCount: number }) => {
      console.log(`✅ Commit success: ${data.socketId}, count: ${data.commitCount}`);
      this.showCommitSuccess(data.socketId, data.commitCount);
    });

    // Push 시작
    socket.on('pushStarted', (data: { socketId: string }) => {
      console.log(`🚀 Push started: ${data.socketId}`);
    });

    // Push 실패
    socket.on('pushFailed', (data: { socketId: string }) => {
      console.log(`❌ Push failed: ${data.socketId}`);
      this.showPushFailed(data.socketId);
    });

    // 게임 종료
    socket.on('gameEnded', (data: { winner: any }) => {
      console.log('🏁 Game ended:', data.winner);
      this.handleGameEnd(data.winner);
    });
  }

  setupInput() {
    // 춤추기 (스페이스바)
    this.input.keyboard?.on('keydown-SPACE', () => {
      socket.emit('playerAction', { action: 'startDancing' });
    });

    this.input.keyboard?.on('keyup-SPACE', () => {
      socket.emit('playerAction', { action: 'stopDancing' });
    });

    // P키로 push
    this.input.keyboard?.on('keydown-P', () => {
      socket.emit('playerAction', { action: 'push' });
    });

    // E키로 운동 애니메이션 (테스트용)
    this.input.keyboard?.on('keydown-E', () => {
      this.playExerciseAnimation();
    });

    // M : 운영진 등장 모션 보기
    this.input.keyboard?.on('keydown-M', () => {
      this.showManagerAppearAnimation();
    });
  }

  setupPlayerPositions() {
    // 화면 크기에 비례하여 플레이어 위치 설정
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    
    // 4명 플레이어를 하단 한 줄에 배치 (화면 크기에 비례)
    const positions = [
      { x: screenWidth * 0.15, y: screenHeight * 0.75 },  // 1번 플레이어
      { x: screenWidth * 0.35, y: screenHeight * 0.75 },  // 2번 플레이어
      { x: screenWidth * 0.55, y: screenHeight * 0.75 },  // 3번 플레이어
      { x: screenWidth * 0.75, y: screenHeight * 0.75 }   // 4번 플레이어
    ];

    positions.forEach((pos, index) => {
      this.playerPositions[`player_${index}`] = pos;
    });
  }

  setupAllDesksAndChairs() {
    // 모든 플레이어 위치에 desk와 chair 미리 배치
    Object.values(this.playerPositions).forEach((position) => {
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      // Desk 배치 (가장 뒤) - 새로운 스케일 시스템 적용
      this.add.image(position.x, position.y + 50 * scaleFactor, 'desk')
        .setScale(this.getImageScale('desk', 0.6))
        .setDepth(1);
      
      // Chair 배치 (가장 앞) - 새로운 스케일 시스템 적용
      this.add.image(position.x, position.y + 120 * scaleFactor, 'chair')
        .setScale(this.getImageScale('chair', 0.6))
        .setDepth(3);
    });
  }

  updateGameState(gameState: GameState) {
    this.gameState = gameState;
    
    // 플레이어 수 업데이트
    const playerCountText = this.children.getByName('playerCount') as Phaser.GameObjects.Text;
    if (playerCountText) {
      playerCountText.setText(`Players: ${gameState.players.length}`);
    }

    // 로컬 플레이어의 게이지 업데이트
    const localPlayer = gameState.players.find(p => p.socketId === this.localPlayerId);
    if (localPlayer) {
      // UI 스케일 팩터 계산
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const uiScale = Math.min(screenWidth / 1200, screenHeight / 800);
      const barWidth = 200 * uiScale;
      
      // 몰입 게이지 (Flow Gauge) 업데이트
      this.focusGaugeValue = localPlayer.flowGauge || 100;
      this.focusBar.width = (this.focusGaugeValue / 100) * barWidth;
      
      // 커밋 게이지 (Commit Gauge) 업데이트
      const commitGaugePercent = (localPlayer.commitGauge / 100) * barWidth;
      this.commitBar.width = commitGaugePercent;
      
      console.log(`🎮 Local player gauges - Flow: ${localPlayer.flowGauge}, Commit: ${localPlayer.commitGauge}, Commits: ${localPlayer.commitCount}`);
      console.log(`📊 Bar widths - Flow: ${this.focusBar.width}, Commit: ${this.commitBar.width}`);
    } else {
      console.log(`❌ Local player not found. LocalPlayerId: ${this.localPlayerId}, Available players:`, gameState.players.map(p => p.socketId));
    }

    // 플레이어들 업데이트
    gameState.players.forEach(playerData => {
      if (!this.players.has(playerData.socketId)) {
        this.addPlayer(playerData);
      } else {
        this.updatePlayer(playerData);
      }
    });

    // 없는 플레이어들 제거
    const currentPlayerIds = new Set(gameState.players.map(p => p.socketId));
    this.players.forEach((_player, socketId) => {
      if (!currentPlayerIds.has(socketId)) {
        this.removePlayer(socketId);
      }
    });
  }

  addPlayer(playerData: GamePlayer) {
    // 플레이어 순서에 따라 위치 결정
    const playerIndex = Array.from(this.players.keys()).length;
    const positions = Object.values(this.playerPositions);
    const position = playerIndex < positions.length ? positions[playerIndex] : { x: 400, y: 300 };
    
    // Player 배치 (중간) - 새로운 스케일 시스템 적용
    const player = new Player(
      this, 
      position.x, 
      position.y, 
      'coding', 
      parseInt(playerData.socketId.slice(-4), 16), // 간단한 ID 생성
      playerData.username
    );
    
    player.setScale(this.getImageScale('player', 0.4)).setDepth(2);

    player.isDancing = playerData.isDancing;
    player.isAlive = playerData.isAlive;
    
    player.anims.play('coding', true);

    // 텍스트도 반응형으로
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
    const fontSize = Math.max(12, 14 * scaleFactor);
    const nameText = this.add.text(position.x, position.y - 150 * scaleFactor, playerData.username, {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
    }).setOrigin(0.5);

    const commitText = this.add.text(position.x, position.y - 130 * scaleFactor, `Commit: ${playerData.commitCount}`, {
      fontSize: `${Math.max(10, 12 * scaleFactor)}px`,
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
    }).setOrigin(0.5);

    player.setData('nameText', nameText);
    player.setData('commitText', commitText);
    this.players.set(playerData.socketId, player);
  }

  updatePlayer(playerData: GamePlayer) {
    const player = this.players.get(playerData.socketId);
    if (!player) return;

    const commitText = player.getData('commitText') as Phaser.GameObjects.Text;
    if (commitText) {
      commitText.setText(`Commit: ${playerData.commitCount}`);
    }

    if (playerData.isDancing && !player.isDancing) {
      player.isDancing = true;
      player.anims.play('dance', true);
      // pkpk 애니메이션용 스케일 적용
      player.setScale(this.getImageScale('pkpk', 0.4));
      console.log(`💃 Player ${playerData.username} started dancing`);
    } else if (!playerData.isDancing && player.isDancing) {
      player.isDancing = false;
      player.anims.play('coding', true);
      // 원래 크기로 복원
      player.setScale(this.getImageScale('player', 0.4));
      console.log(`🛑 Player ${playerData.username} stopped dancing`);
    }

    player.isAlive = playerData.isAlive;
    if (!playerData.isAlive) {
      player.setTexture('death-image');
      player.setScale(0.8);
    } else {
      player.setTexture('player');
      player.setScale(1);
    }
  }

  // 사망한 플레이어 제거
  removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      const nameText = player.getData('nameText') as Phaser.GameObjects.Text;
      if (nameText) {
        nameText.destroy();
      }

      const commitText = player.getData('commitText') as Phaser.GameObjects.Text;
      if (commitText) {
        commitText.destroy();
      }
      
      player.destroy();
      this.players.delete(socketId);
    }
  }

  handlePlayerAction(data: { socketId: string; action: string; payload?: any }) {
    const player = this.players.get(data.socketId);
    if (!player) return;

    switch (data.action) {
      case 'startDancing':
        player.isDancing = true;
        player.anims.play('dance', true);
        player.setScale(this.getImageScale('pkpk', 0.4)); // pkpk 애니메이션용 스케일
        break;
      case 'stopDancing':
        player.isDancing = false;
        player.anims.play('coding', true);
        player.setScale(this.getImageScale('player', 0.4)); // 원래 크기로 복원
        break;
      case 'push':
        // Push 기능은 백엔드에서만 처리 (시각적 애니메이션 없음)
        console.log('Push action received');
        break;
      case 'move':
        // 이동 로직은 서버에서 처리되므로 여기서는 시각적 효과만
        break;
    }
  }



  update(_time: number, delta: number) {
    // 백엔드에서 게이지를 관리하므로 로컬 업데이트 제거
    // 게이지 업데이트는 gameStateUpdate 이벤트에서 처리됨
  }

  // 운영진 등장 애니메이션 표시
  showManagerAppearAnimation() {
    // 화면 크기에 비례하여 스케일 계산
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
    
    // 화면 위쪽 중앙에 운영진 스프라이트 생성 (반응형)
    const managerSprite = this.add.sprite(
      this.scale.width / 2, 
      100 * scaleFactor, // 화면 위쪽
      'pkpk' // pkpk 스프라이트시트 사용
    ).setScale(this.getImageScale('pkpk', 0.8)); // 새로운 스케일 시스템 적용

    // 운영진 등장 애니메이션 재생
    managerSprite.play('manager-appear');

    // 애니메이션 완료 후 스프라이트 제거
    managerSprite.once('animationcomplete', () => {
      console.log('Manager appear animation completed');
      managerSprite.destroy();
    });

    console.log('Manager appear animation started');
  }

  // 플레이어 사망 처리
  handlePlayerDeath(socketId: string, reason: string) {
    const player = this.players.get(socketId);
    if (player) {
      player.isAlive = false;
      
      // 화면 크기에 비례하여 스케일 계산
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      // 사망 이미지로 변경
      player.setTexture('death-image');
      player.setScale(this.getImageScale('death-image', 0.8)); // 새로운 스케일 시스템 적용
      
      // 사망 이유 표시 (반응형)
      const deathText = this.add.text(player.x, player.y - 200 * scaleFactor, `💀 ${reason}`, {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);

      // 3초 후 사망 텍스트 제거
      this.time.delayedCall(3000, () => {
        deathText.destroy();
      });
    }
  }

  // 커밋 성공 표시
  showCommitSuccess(socketId: string, commitCount: number) {
    const player = this.players.get(socketId);
    if (player) {
      // 화면 크기에 비례하여 스케일 계산
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      const successText = this.add.text(player.x, player.y - 200 * scaleFactor, `✅ Commit #${commitCount}!`, {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);

      // 2초 후 텍스트 제거
      this.time.delayedCall(2000, () => {
        successText.destroy();
      });
    }
  }
  // Push 실패 표시
  showPushFailed(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      // 화면 크기에 비례하여 스케일 계산
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      const failText = this.add.text(player.x, player.y - 200 * scaleFactor, '❌ PUSH FAILED!', {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);

      // 2초 후 텍스트 제거
      this.time.delayedCall(2000, () => {
        failText.destroy();
      });
    }
  }

  // 운동 애니메이션 재생 (테스트용)
  playExerciseAnimation() {
    const localPlayer = this.players.get(this.localPlayerId);
    if (localPlayer) {
      localPlayer.anims.play('exercise', true);
      console.log('🏃 Exercise animation started');
      
      // 3초 후 코딩 애니메이션으로 복귀
      this.time.delayedCall(3000, () => {
        if (!localPlayer.isDancing) {
          localPlayer.anims.play('coding', true);
        }
      });
    }
  }

  // 게임 종료 처리
  handleGameEnd(winner: any) {
    // 게임 종료 텍스트 표시
    const gameEndText = this.add.text(
      this.scale.width / 2, 
      this.scale.height / 2, 
      winner ? `🏆 Winner: ${winner.username}!` : '🏁 Game Over - No Winner',
      {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);

    // 5초 후 로비로 이동
    this.time.delayedCall(5000, () => {
      window.location.href = '/';
    });
  }
}