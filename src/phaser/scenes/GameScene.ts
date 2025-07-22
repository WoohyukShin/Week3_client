// src/phaser/scenes/GameScene.ts
import Phaser from 'phaser';
import socketService from '../../services/socket';
import Player from '../object/Player';

interface GamePlayer {
  socketId: string;
  username: string;
  isAlive: boolean;
  playerMotion: string; // 'coding' | 'dancing' | 'bumpercar' | 'exercise' | 'coffee' | 'shotgun' | 'gaming'
  flowGauge: number;
  skill: string | null;
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
    manager: 1.0,      // 매니저 애니메이션 크기
    coffee: 1.0,       // 커피 애니메이션 크기
    shotgun: 1.0,      // 샷건 애니메이션 크기
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
    this.load.spritesheet('coffee', '/src/assets/img/coffee.png', {
      frameWidth: 736/4,
      frameHeight: 262,
    });
    this.load.spritesheet('shotgun', '/src/assets/img/shotgun.png', {
      frameWidth: 1253/7,
      frameHeight: 199,
    });

    this.load.image('door', '/src/assets/img/door.png');
    this.load.image('death-image', '/src/assets/img/deathplayer.png');
  }

  create() {
    // 모든 상태를 완전히 새로 초기화
    this.players = new Map();
    this.localPlayerId = '';
    this.gameState = { roomId: '', players: [], isManagerAppeared: false };
    this.focusGaugeValue = 100;
    this.managerAppearTimeout = null;
    this.isManagerAppearing = false;
    this.bumpercarAudio = null;
    this.playerPositions = {};

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
    const fontSize = Math.max(12, 14 * uiScale);
    
    // Flow Gauge
    this.focusBarBg = this.add.rectangle(20 * uiScale, 20 * uiScale, barWidth, barHeight, 0x222222).setOrigin(0, 0);
    this.focusBar = this.add.rectangle(20 * uiScale, 20 * uiScale, barWidth, barHeight, 0x00aaff).setOrigin(0, 0);
    
    // 게이지 라벨
    this.add.text((20 + barWidth + 10) * uiScale, (20 + barHeight/2) * uiScale, 'Flow', { 
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
    this.anims.create({
      key: 'coffee',
      frames: this.anims.generateFrameNumbers('coffee', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: 0 // 한 번만 재생
    });
    this.anims.create({
      key: 'shotgun',
      frames: this.anims.generateFrameNumbers('shotgun', { start: 0, end: 6 }),
      frameRate: 12,
      repeat: 0 // 한 번만 재생
    });
  }

  setupSocketListeners() {
    // 기존 리스너 모두 해제
    socketService.off('gameStateUpdate');
    socketService.off('playerJoined');
    socketService.off('playerLeft');
    socketService.off('playerAction');
    socketService.off('setLocalPlayer');
    socketService.off('playerDied');
    socketService.off('commitSuccess');
    socketService.off('pushStarted');
    socketService.off('pushFailed');
    socketService.off('gameEnded');
    socketService.off('managerAppeared');
    socketService.off('skillEffect');
    // 이후 새로 등록

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
      console.log("[DEBUG] GameScene.ts : skill used!!");
      socketService.emit('skillUse', {});
    });
  }

  setupPlayerPositions() { // player 위치 설정
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

  setupAllDesksAndChairs() { // 책상, 의자 설정
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

  setupManagerArea() { // 운영진 위치 설정
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
      // 게이지 변경 로그 (디버깅용)
      if (oldFlowGauge !== this.focusGaugeValue) {
        console.log(`📊 [${localPlayer.username}] Flow: ${oldFlowGauge} → ${this.focusGaugeValue}`);
      }
      // 모든 플레이어의 게이지 상태 로그 (디버깅용)
      console.log(`🎮 GameState received - Manager: ${gameState.isManagerAppeared}, Players: ${gameState.players.length}`);
      gameState.players.forEach(p => {
        console.log(`  👤 [${p.username}] Flow: ${p.flowGauge}`);
      });
      console.log(`📊 Bar widths - Flow: ${this.focusBar.width}`);
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

    player.isAlive = playerData.isAlive;
    player.playerMotion = playerData.playerMotion;
    // 애니메이션 처리
    this.applyPlayerMotion(player, playerData.playerMotion);

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

    player.setData('nameText', nameText);
    this.players.set(playerData.socketId, player);
  }

  updatePlayer(playerData: GamePlayer) {
    const player = this.players.get(playerData.socketId);
    if (!player || !player.scene || !player.texture || typeof player.setTexture !== 'function') return;
    // 죽은 플레이어는 무조건 death-image
    if (!playerData.isAlive) {
      if (player.isAlive) {
        player.isAlive = false;
        this.applyPlayerMotion(player, 'dead');
      }
      player.anims.stop();
      return;
    } else if (playerData.isAlive && !player.isAlive) {
      player.isAlive = true;
      this.applyPlayerMotion(player, playerData.playerMotion);
    }
    // 살아있는 경우에만 playerMotion 변화 감지
    if (player.playerMotion !== playerData.playerMotion) {
      this.applyPlayerMotion(player, playerData.playerMotion);
      player.playerMotion = playerData.playerMotion;
    }
  }

  applyPlayerMotion(player: Player, motion: string) {
    if (!player.isAlive && motion !== 'dead') {
      // 죽은 상태면 무조건 death-image
      player.setTexture('death-image');
      player.setScale(this.getImageScale('death-image'));
      player.anims.stop();
      return;
    }
    switch (motion) {
      case 'dancing':
        player.anims.play('dance', true);
        player.setScale(this.getImageScale('pkpk'));
        break;
      case 'bumpercar':
        player.anims.play('bumpercar', true);
        player.setScale(this.getImageScale('bumpercar'));
        break;
      case 'exercise':
        player.anims.play('exercise', true);
        player.setScale(this.getImageScale('exercise'));
        break;
      case 'coffee':
        player.anims.play('coffee', true);
        player.setScale(this.getImageScale('coffee'));
        player.once('animationcomplete-coffee', () => {
          socketService.emit('animationComplete', { type: 'coffee' });
        });
        break;
      case 'shotgun':
        player.anims.play('shotgun', true);
        player.setScale(this.getImageScale('shotgun'));
        player.once('animationcomplete-shotgun', () => {
          socketService.emit('animationComplete', { type: 'shotgun' });
        });
        break;
      case 'gaming':
        player.anims.play('coding', true);
        player.setScale(this.getImageScale('player'));
        break;
      case 'coding':
      default:
        player.anims.play('coding', true);
        player.setScale(this.getImageScale('player'));
        break;
      case 'dead':
        player.setTexture('death-image');
        player.setScale(this.getImageScale('death-image'));
        player.anims.stop();
        break;
    }
  }

  removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      const nameText = player.getData('nameText') as Phaser.GameObjects.Text;
      if (nameText) {
        nameText.destroy();
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
        player.playerMotion = 'dancing';
        break;
      case 'stopDancing':
        player.playerMotion = 'coding';
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
      localPlayer.playerMotion = 'exercise';
      localPlayer.anims.play('exercise', true);
      localPlayer.setScale(this.getImageScale('exercise'));
      console.log('🏃 Exercise animation started');
      
      // 3초 후에 원래 상태로 복귀 (단, 춤추고 있지 않을 때만)
      this.time.delayedCall(3000, () => {
        if (localPlayer && localPlayer.playerMotion !== 'dancing') {
          localPlayer.playerMotion = 'coding';
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