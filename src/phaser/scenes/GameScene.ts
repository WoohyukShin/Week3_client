// src/phaser/scenes/GameScene.ts
import Phaser from 'phaser';
import socketService from '../../services/socket';
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
  private managerSprite!: Phaser.GameObjects.Sprite;
  private managerAppearTimeout: any = null;
  private isManagerAppearing: boolean = false;
  private bumpercarAudio: HTMLAudioElement | null = null;

  // 이미지별 스케일 설정 (워터마크 제거 및 crop에 따른 조정)
  private readonly IMAGE_SCALES = {
    coding: 1.0,      // 코딩 애니메이션 크기
    exercise: 1.2,    // 운동 애니메이션 크기
    pkpk: 1.5,      // pkpk 애니메이션 크기
    desk: 1.0,        // 책상 크기
    chair: 0.5,       // 의자 크기
    player: 1.0,      // 플레이어 기본 크기
    'death-image': 0.7, // 사망 이미지 크기
    door: 1.2,        // 문 이미지 크기
    manager: 1.0      // 매니저 애니메이션 크기
  };

  constructor() {
    super('GameScene');
  }

  // 이미지별 스케일 계산 헬퍼 함수
  private getImageScale(imageKey: string): number {
    const imageScale = this.IMAGE_SCALES[imageKey as keyof typeof this.IMAGE_SCALES] || 1.0;
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
    
    return imageScale * scaleFactor;
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
    this.load.spritesheet('manager', '/src/assets/img/manager.png', {
      frameWidth: 1093/6,
      frameHeight: 228,
    });
    this.load.spritesheet('bumpercar', '/src/assets/img/bumpercar.png', {
      frameWidth: 877/4,
      frameHeight: 284,
    });

    this.load.image('door', '/src/assets/img/door.png');
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
    
    // 매니저 위치에 door 이미지 배치 (평소 상태)
    this.setupManagerArea();
    
    // 게임 상태 요청
    socketService.emit('getGameState', {});
  }

  setupUI() {
    // 화면 크기에 비례하여 UI 크기 설정
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const uiScale = Math.min(screenWidth / 1200, screenHeight / 800); // UI 스케일 팩터
    
    const barWidth = 200 * uiScale * 1.5; // 게이지 바 크기 1.5배 확대
    const barHeight = 20 * uiScale * 1.5; // 게이지 바 높이 1.5배 확대
    const commitBarHeight = 15 * uiScale * 1.5; // 커밋 게이지 높이 1.5배 확대
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
    // 운영진 등장 애니메이션 (manager 스프라이트시트 사용)
    this.anims.create({
      key: 'manager',
      frames: this.anims.generateFrameNumbers('manager', { start: 0, end: 5 }), 
      frameRate: 12,
      repeat: -1
    });
    // 범퍼카 재생 애니메이션 (bumpercar 스프라이트시트 사용)
    this.anims.create({
      key: 'bumpercar',
      frames: this.anims.generateFrameNumbers('bumpercar', { start: 0, end: 3 }),
      frameRate: 12,
      repeat: -1
    });
  }

  setupSocketListeners() {
    // 게임 상태 업데이트
    socketService.on('gameStateUpdate', (gameState: GameState) => {
      console.log('GameState Update:', gameState);
      this.updateGameState(gameState);
    });
    // 플레이어 추가
    socketService.on('playerJoined', (playerData: GamePlayer) => {
      console.log('Player joined game:', playerData);
      this.addPlayer(playerData);
    });
    // 플레이어 제거
    socketService.on('playerLeft', (playerData: { socketId: string }) => {
      console.log('Player left game:', playerData);
      this.removePlayer(playerData.socketId);
    });
    // 플레이어 액션
    socketService.on('playerAction', (data: { socketId: string; action: string; payload?: any }) => {
      console.log('Player action:', data);
      this.handlePlayerAction(data);
    });
    // 로컬 플레이어 ID 설정
    socketService.on('setLocalPlayer', (playerId: string) => {
      this.localPlayerId = playerId;
      console.log('Local player ID set:', playerId);
    });
    // === 백엔드 게임 이벤트 연동 ===

    // 플레이어 사망
    socketService.on('playerDied', (data: { socketId: string; reason: string }) => {
      console.log(`💀 Player died: ${data.socketId}, reason: ${data.reason}`);
      this.handlePlayerDeath(data.socketId, data.reason);
    });

    // 커밋 성공
    socketService.on('commitSuccess', (data: { socketId: string; commitCount: number }) => {
      console.log(`✅ Commit success: ${data.socketId}, count: ${data.commitCount}`);
      this.showCommitSuccess(data.socketId, data.commitCount);
    });

    // Push 시작
    socketService.on('pushStarted', (data: { socketId: string }) => {
      console.log(`🚀 Push started: ${data.socketId}`);
    });

    // Push 실패
    socketService.on('pushFailed', (data: { socketId: string }) => {
      console.log(`❌ Push failed: ${data.socketId}`);
      this.showPushFailed(data.socketId);
    });

    // 게임 종료
    socketService.on('gameEnded', (data: { winner: any }) => {
      console.log('�� Game ended:', data.winner);
      this.handleGameEnd(data.winner);
    });

    socketService.on('managerAppeared', () => {
      if (this.managerAppearTimeout) {
        clearTimeout(this.managerAppearTimeout);
      }
      this.isManagerAppearing = true;
      this.showManagerAppearAnimation();
      this.managerAppearTimeout = setTimeout(() => {
        this.isManagerAppearing = false;
        this.hideManagerAnimation();
      }, 600);
    });

    // 스킬 효과 처리
    socketService.on('skillEffect', (data: { type: string; socketId: string; duration?: number }) => {
      // 1. bumpercar
      if (data.type === 'bumpercar') {
        const player = this.players.get(data.socketId);
        if (player) {
          player.bumpercar = true;
          player.anims.play('bumpercar', true);
          player.setScale(this.getImageScale('bumpercar'));
        }
        const soundIdx = Math.random() < 0.5 ? 1 : 2;
        const audio = new Audio(`/src/assets/sound/bumpercar_sound${soundIdx}.mp3`);
        audio.play();
        this.bumpercarAudio = audio;
      } else if (data.type === 'bumpercarEnd') {
        const player = this.players.get(data.socketId);
        if (player) {
          player.bumpercar = false;
          if (player.isAlive) {
            player.anims.play('coding', true);
            player.setScale(this.getImageScale('player'));
          }
        }
        if (this.bumpercarAudio) {
          this.bumpercarAudio.pause();
          this.bumpercarAudio.currentTime = 0;
          this.bumpercarAudio = null;
        }
      }
    });
  }

  setupInput() {
    // 춤추기 (스페이스바)
    this.input.keyboard?.on('keydown-SPACE', () => {
      socketService.emit('playerAction', { action: 'startDancing' });
    });
    this.input.keyboard?.on('keyup-SPACE', () => {
      socketService.emit('playerAction', { action: 'stopDancing' });
    });
    // P키로 push
    this.input.keyboard?.on('keydown-P', () => {
      socketService.emit('playerAction', { action: 'push' });
    });
    // Z키로 스킬 사용
    this.input.keyboard?.on('keydown-Z', () => {
      socketService.emit('skillUse', {});
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
        .setScale(this.getImageScale('desk'))
        .setDepth(1);
      
      // Chair 배치 (가장 앞) - 새로운 스케일 시스템 적용
      this.add.image(position.x, position.y + 120 * scaleFactor, 'chair')
        .setScale(this.getImageScale('chair'))
        .setDepth(3);
    });
  }

  setupManagerArea() {
    // 매니저 위치 설정 (화면 3/4 정도)
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
    
    // 매니저 위치에 door 이미지 배치 (평소 상태)
    this.managerSprite = this.add.sprite(
      screenWidth * 0.75, // 화면 3/4 위치
      screenHeight * 0.3,  // 화면 상단 30% 위치
      'door'
    ).setScale(this.getImageScale('door'))
     .setDepth(2);
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
      const barWidth = 200 * uiScale * 1.5; // 게이지 바 크기 1.5배 확대
      // 몰입 게이지 (Flow Gauge) 업데이트
      const oldFlowGauge = this.focusGaugeValue;
      this.focusGaugeValue = localPlayer.flowGauge || 100;
      this.focusBar.width = (this.focusGaugeValue / 100) * barWidth;
      // 커밋 게이지 (Commit Gauge) 업데이트
      const oldCommitGauge = this.commitBar.width;
      const commitGaugePercent = (localPlayer.commitGauge / 100) * barWidth;
      this.commitBar.width = commitGaugePercent;
      // 게이지 변경 로그 (디버깅용)
      if (oldFlowGauge !== this.focusGaugeValue || oldCommitGauge !== this.commitBar.width) {
        console.log(`📊 [${localPlayer.username}] Flow: ${oldFlowGauge} → ${this.focusGaugeValue}, Commit: ${Math.round(oldCommitGauge)} → ${Math.round(this.commitBar.width)}`);
      }
      // 모든 플레이어의 게이지 상태 로그 (디버깅용)
      console.log(`🎮 GameState received - Manager: ${gameState.isManagerAppeared}, Players: ${gameState.players.length}`);
      gameState.players.forEach(p => {
        console.log(`  👤 [${p.username}] Flow: ${p.flowGauge}, Commit: ${p.commitGauge}, Dancing: ${p.isDancing}, Alive: ${p.isAlive}`);
      });
      console.log(`📊 Bar widths - Flow: ${this.focusBar.width}, Commit: ${this.commitBar.width}`);
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
    
    player.setScale(this.getImageScale('player')).setDepth(2);

    player.isDancing = playerData.isDancing;
    player.isAlive = playerData.isAlive;
    
    // 사망 상태면 death 이미지, 생존 상태면 코딩 애니메이션
    if (playerData.isAlive) {
      player.anims.play('coding', true);
    } else {
      player.setTexture('death-image');
      player.setScale(this.getImageScale('death-image'));
      player.anims.stop();
    }

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
    if (!player || !player.scene || !player.texture || typeof player.setTexture !== 'function') return;

    const commitText = player.getData('commitText') as Phaser.GameObjects.Text;
    if (commitText) {
      commitText.setText(`Commit: ${playerData.commitCount}`);
    }

    if (!playerData.isAlive) {
      if (player.isAlive) {
        player.isAlive = false;
        if (player.scene && player.texture && typeof player.setTexture === 'function') {
          player.setTexture('death-image');
          player.setScale(this.getImageScale('death-image'));
        }
        console.log(`💀 Player ${playerData.username} died`);
      }
      player.anims.stop();
      return;
    } else if (playerData.isAlive && !player.isAlive) {
      player.isAlive = true;
      if (player.scene && player.texture && typeof player.setTexture === 'function') {
        player.setTexture('coding');
        player.setScale(this.getImageScale('player'));
      }
      console.log(`🔄 Player ${playerData.username} revived`);
    }

    if (playerData.isAlive) {
      // Exercise 애니메이션 중일 때는 덮어쓰지 않음 (3초간 보호)
      const isExerciseAnimation = player.anims.currentAnim?.key === 'exercise';
      
      if (playerData.isDancing && !player.isDancing) {
        player.isDancing = true;
        if (!isExerciseAnimation && player.anims.currentAnim?.key !== 'dance') {
          player.anims.play('dance', true);
        }
        if (!isExerciseAnimation) {
          player.setScale(this.getImageScale('pkpk'));
        }
        console.log(`💃 Player ${playerData.username} started dancing`);
      } else if (!playerData.isDancing && player.isDancing) {
        player.isDancing = false;
        if (!isExerciseAnimation && player.anims.currentAnim?.key !== 'coding') {
          player.anims.play('coding', true);
        }
        if (!isExerciseAnimation) {
          player.setScale(this.getImageScale('player'));
        }
        console.log(`🛑 Player ${playerData.username} stopped dancing`);
      }
    }
  }

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

    if (!player.isAlive) {
      return;
    }

    switch (data.action) {
      case 'startDancing':
        player.isDancing = true;
        if (player.anims.currentAnim?.key !== 'dance') {
          player.anims.play('dance', true);
        }
        player.setScale(this.getImageScale('pkpk'));
        break;
      case 'stopDancing':
        player.isDancing = false;
        if (player.anims.currentAnim?.key !== 'coding') {
          player.anims.play('coding', true);
        }
        player.setScale(this.getImageScale('player'));
        break;
      case 'push':
        console.log('Push action received');
        break;
    }
  }

  showManagerAppearAnimation() {
    // 기존 door 이미지를 manager 애니메이션으로 변경
    if (this.managerSprite) {
      console.log('🎭 Changing door to manager animation...');
      this.managerSprite.setTexture('manager');
      this.managerSprite.setScale(this.getImageScale('manager'));
      this.managerSprite.play('manager');
      
      console.log('🚨 Manager appeared and started animation!');
    } else {
      console.log('❌ Manager sprite not found!');
    }
  }

  hideManagerAnimation() {
    // manager 애니메이션을 door 이미지로 변경
    if (this.managerSprite) {
      console.log('🎭 Changing manager animation back to door...');
      this.managerSprite.setTexture('door');
      this.managerSprite.setScale(this.getImageScale('door'));
      this.managerSprite.stop();
      
      console.log('🚪 Manager disappeared, showing door');
    } else {
      console.log('❌ Manager sprite not found!');
    }
  }

  handlePlayerDeath(socketId: string, reason: string) {
    const player = this.players.get(socketId);
    if (player) {
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      const deathText = this.add.text(player.x, player.y - 200 * scaleFactor, `💀 ${reason}`, {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);

      this.time.delayedCall(3000, () => {
        deathText.destroy();
      });
    }
  }

  showCommitSuccess(socketId: string, commitCount: number) {
    const player = this.players.get(socketId);
    if (player) {
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      const successText = this.add.text(player.x, player.y - 200 * scaleFactor, `✅ Commit #${commitCount}!`, {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);

      this.time.delayedCall(2000, () => {
        successText.destroy();
      });
    }
  }
  showPushFailed(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      
      const failText = this.add.text(player.x, player.y - 200 * scaleFactor, '❌ PUSH FAILED!', {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);

      this.time.delayedCall(2000, () => {
        failText.destroy();
      });
    }
  }

  playExerciseAnimation() {
    const localPlayer = this.players.get(this.localPlayerId);
    if (localPlayer) {
      // Exercise 애니메이션을 강제로 재생하고 3초간 유지
      localPlayer.anims.play('exercise', true);
      localPlayer.setScale(this.getImageScale('exercise'));
      console.log('🏃 Exercise animation started');
      
      // 3초 후에 원래 상태로 복귀 (단, 춤추고 있지 않을 때만)
      this.time.delayedCall(3000, () => {
        if (localPlayer && !localPlayer.isDancing) {
          localPlayer.anims.play('coding', true);
          localPlayer.setScale(this.getImageScale('player'));
          console.log('🏃 Exercise animation ended, back to coding');
        }
      });
    }
  }

  handleGameEnd(winner: any) {
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

    this.time.delayedCall(5000, () => {
      window.location.href = '/';
    });
  }
}