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
  private deskMap: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private chairMap: Map<number, Phaser.GameObjects.Image> = new Map();
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
  private bgmAudio: HTMLAudioElement | null = null;
  private SFX_MAP: Record<string, string[] | (() => string)> = {
    bumpercar: [
      '/sound/bumpercar_sound1.mp3',
      '/sound/bumpercar_sound2.mp3',
    ],
    coffee: [
      '/sound/coffee_sound1.mp3',
      '/sound/coffee_sound2.mp3',
    ],
    exercise: [
    ],
    shotgun: [
      '/sound/shotgun_sound1.mp3',
      '/sound/shotgun_sound2.mp3',
    ],
    game: [
      '/sound/game_sound1.mp3',
      '/sound/game_sound2.mp3',
    ],
    coding: [
      '/sound/coding_sound1.mp3',
      '/sound/coding_sound2.mp3',
    ],
    manager: [
      '/sound/manager1.mp3',
      '/sound/manager2.mp3',
      '/sound/manager3.mp3',
      '/sound/manager4.mp3',
      '/sound/manager5.mp3',
      '/sound/manager6.mp3',
    ],
  };

  // 이미지별 스케일 설정 (워터마크 제거 및 crop에 따른 조정)
  private readonly IMAGE_SCALES = {
    coding: 1.0,      // 코딩 애니메이션 크기
    exercise: 1.2,    // 운동 애니메이션 크기
    pkpk: 1.5,      // pkpk 애니메이션 크기
    desk: 1.4,        // 책상 크기
    chair: 0.4,       // 의자 크기
    player: 1.0,      // 플레이어 기본 크기
    'death-image': 0.7, // 사망 이미지 크기
    door: 1.6,        // 문 이미지 크기
    manager: 1.4,      // 매니저 애니메이션 크기
    coffee: 1.0,       // 커피 애니메이션 크기
    shotgun: 1.3,      // 샷건 애니메이션 크기
  };

  private DANCE_BGM_MAP: Record<string, string[]> = {
    pkpk: [
      '/sound/pkpk.mp3',
    ],
    // 추후 danceType별로 추가
  };
  private currentDanceAudio: HTMLAudioElement | null = null;
  private BGM_VOLUME = 0.5;
  private SFX_VOLUME = 1.0;
  private DANCE_BGM_VOLUME = 1.0;
  private SOUND_SCALES: Record<string, number> = {
    bgm: 0.5,
    bumpercar: 1.0,
    coffee: 0.8,
    exercise: 1.0,
    shotgun: 0.8,
    game: 1.0,
    default: 1.0,
    pkpk: 0.5,
    manager: 2.0,
  };
  private danceAudioArr: { danceType: string; audio: HTMLAudioElement }[] = [];
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private prevSpaceDown: boolean = false;

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
    this.load.image('background', '/img/game_background.jpg');
    this.load.image('chair', '/img/chair.png');
    
    // 스프라이트시트 로드 (프레임 크기 조정)
    this.load.spritesheet('desk', '/img/desk.png', {
      frameWidth: 1148/4,
      frameHeight: 217,
    });
    this.load.spritesheet('coding', '/img/coding.png', {
      frameWidth: 809/3,
      frameHeight: 307,
    });
    this.load.spritesheet('exercise', '/img/exercise.png', {
      frameWidth: 1067/5,
      frameHeight: 234,
    });
    this.load.spritesheet('pkpk', '/img/pkpk.png', {
      frameWidth: 1154/6,
      frameHeight: 216,
    });
    this.load.spritesheet('manager', '/img/manager.png', {
      frameWidth: 1093/6,
      frameHeight: 228,
    });
    this.load.spritesheet('bumpercar', '/img/bumpercar.png', {
      frameWidth: 877/4,
      frameHeight: 284,
    });
    this.load.spritesheet('coffee', '/img/coffee.png', {
      frameWidth: 736/4,
      frameHeight: 262,
    });
    this.load.spritesheet('shotgun', '/img/shotgun.png', {
      frameWidth: 1253/7,
      frameHeight: 199,
    });

    this.load.image('door', '/img/door.png');
    this.load.image('death-image', '/img/deathplayer.png');
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
    this.deskMap.clear(); // 초기화
    this.chairMap.clear(); // 초기화

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

    // 키보드 소리 반복 재생
    this.bgmAudio = new Audio('/sound/coding_sound1.mp3');
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = this.SOUND_SCALES['bgm'] ?? 0.5;
    this.bgmAudio.play().catch(() => {}); // 자동재생 정책 대응
    this.scale.on('resize', this.handleResize, this);
  }

  // destroy 시 배경음악 정지
  shutdown() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
  }
  destroy() {
    this.shutdown();
    // super.destroy(); // Phaser.Scene에는 destroy() 없음
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

    // 운영진 등장
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

    // 진짜 게임 시작 신호
    socketService.on('startGameLoop', () => {
      console.log('[DEBUG] GameScene.ts : startGameLoop');
      if (this.bgmAudio) {
        this.bgmAudio.currentTime = 0;
        this.bgmAudio.volume = this.SOUND_SCALES['bgm'] ?? 0.5;
        this.bgmAudio.play().catch(() => {});
      }
    });
    // 게임 종료 시 모든 사운드 정지
    socketService.on('gameEnded', () => {
      console.log('[DEBUG] GameScene.ts : gameEnded - 모든 사운드 정지');
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      }
      this.danceAudioArr.forEach(({ audio }) => {
        audio.pause();
        audio.currentTime = 0;
      });
      this.danceAudioArr = [];
    });
    // 스킬 SFX 재생 이벤트
    socketService.on('playSkillSfx', (data: { type: string }) => {
      console.log('[DEBUG] GameScene.ts : playSkillSfx : ', data.type);
      const sfxList = this.SFX_MAP[data.type];
      const volume = this.SOUND_SCALES[data.type] ?? 1.0;
      if (sfxList) {
        let sfxPath = '';
        if (Array.isArray(sfxList)) {
          // 랜덤 선택
          sfxPath = sfxList[Math.floor(Math.random() * sfxList.length)];
        } else if (typeof sfxList === 'function') {
          sfxPath = sfxList();
        }
        if (sfxPath) {
          const audio = new Audio(sfxPath);
          audio.volume = volume;
          audio.play();
        }
      }
    });
    // 춤별 BGM 재생 (여러 명 동시 가능)
    socketService.on('playDanceBgm', (data: { danceType: string }) => {
      console.log('[DEBUG] GameScene.ts : playDanceBgm : ', data.danceType);
      const bgmList = this.DANCE_BGM_MAP[data.danceType];
      if (!bgmList || bgmList.length === 0) return;
      const volume = this.SOUND_SCALES[data.danceType] ?? 1.0;
      const bgmPath = bgmList[0];
      const audio = new Audio(bgmPath);
      audio.loop = true;
      audio.volume = volume;
      audio.play().catch(() => {});
      this.danceAudioArr.push({ danceType: data.danceType, audio });
    });
    // 춤별 BGM 정지 (해당 danceType만 모두 정지)
    socketService.on('stopDanceBgm', (data: { danceType: string }) => {
      console.log('[DEBUG] GameScene.ts : stopDanceBgm : ', data.danceType);
      this.danceAudioArr = this.danceAudioArr.filter(({ danceType, audio }) => {
        if (danceType === data.danceType) {
          audio.pause();
          audio.currentTime = 0;
          return false;
        }
        return true;
      });
    });
  }

  setupInput() {
    // 춤추기 (스페이스바)
    if (!this.input.keyboard) return;
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // Z키로 스킬 사용
    this.input.keyboard.on('keydown-Z', () => {
      console.log("[DEBUG] GameScene.ts : skill used!!");
      socketService.emit('skillUse', {});
    });
  }

  update() {
    if (!this.spaceKey) return;
    // 스페이스바 JustDown: 춤 시작
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const danceTypes = Object.keys(this.DANCE_BGM_MAP);
      const randomDanceType = danceTypes[Math.floor(Math.random() * danceTypes.length)];
      socketService.emit('playerAction', { action: 'startDancing', payload: { danceType: randomDanceType } });
    }
    // 스페이스바 JustUp: 춤 멈춤
    if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
      const danceTypes = Object.keys(this.DANCE_BGM_MAP);
      const randomDanceType = danceTypes[Math.floor(Math.random() * danceTypes.length)];
      socketService.emit('playerAction', { action: 'stopDancing', payload: { danceType: randomDanceType } });
    }
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
    Object.values(this.playerPositions).forEach((position, idx) => {
      const screenWidth = this.scale.width;
      const screenHeight = this.scale.height;
      const scaleFactor = Math.min(screenWidth / 1200, screenHeight / 800);
      // 책상은 기존보다 오른쪽 위로 이동
      const deskX = position.x + 20;
      const deskY = position.y + 50 * scaleFactor - 20;
      // 의자는 기존보다 아래로 이동
      const chairY = position.y + 120 * scaleFactor + 40;
      // Desk 스프라이트 생성 (플레이어별)
      const deskFrame = 3;
      const deskSprite = this.add.sprite(deskX, deskY, 'desk', deskFrame)
        .setScale(this.getImageScale('desk'))
        .setDepth(1);
      this.deskMap.set(idx, deskSprite);
      // Chair 배치 및 관리
      const chair = this.add.image(position.x, chairY, 'chair')
        .setScale(this.getImageScale('chair'))
        .setDepth(3);
      this.chairMap.set(idx, chair);
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
    // deskSprite는 이미 자리별로 생성되어 있으므로 따로 생성하지 않음

    // Player 배치 (중간)
    const player = new Player(
      this,
      position.x,
      position.y,
      'coding',
      parseInt(playerData.socketId.slice(-4), 16),
      playerData.username
    );
    player.setScale(this.getImageScale('player')).setDepth(2);
    player.isAlive = playerData.isAlive;
    player.playerMotion = playerData.playerMotion;
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
      // 자리 인덱스 계산
      const playerIndex = Array.from(this.players.keys()).indexOf(playerData.socketId);
      const deskSprite = this.deskMap.get(playerIndex);
      if (deskSprite) {
        if (playerData.playerMotion === 'gaming') {
          console.log("[DEBUG] GameScene.ts : 'gaming' 모션 재생하려고 함.")
          const deskFrame = Math.floor(Math.random() * 3);
          deskSprite.setFrame(deskFrame);
          deskSprite.setScale(this.getImageScale('desk') * 1.5);
          deskSprite.y = this.playerPositions[`player_${playerIndex}`].y + 50 * Math.min(this.scale.width / 1200, this.scale.height / 800) - 40;
        } else {
          deskSprite.setFrame(3);
          deskSprite.setScale(this.getImageScale('desk'));
          deskSprite.y = this.playerPositions[`player_${playerIndex}`].y + 50 * Math.min(this.scale.width / 1200, this.scale.height / 800) - 20;
        }
      }
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
      case 'pkpk':
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
        break;
      case 'coding':
      default:
        player.anims.play('coding', true);
        player.setScale(this.getImageScale('player'));
        break;
      case 'dead':
        player.setTexture('death-image');
        player.setScale(this.getImageScale('death-image'));
        player.setPosition(player.x, player.y + 30);
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
      // deskSprite는 이미 자리별로 생성되어 있으므로 따로 삭제하지 않음
      // chair도 관리하므로 삭제
      const playerIndex = Array.from(this.players.keys()).indexOf(socketId);
      const chair = this.chairMap.get(playerIndex);
      if (chair) {
        chair.destroy();
        this.chairMap.delete(playerIndex);
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
        player.playerMotion = data.payload?.danceType || 'coding'; // 춤 이름 설정
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
      this.managerSprite.play({ key: 'manager', repeat: 0 }); // 반복 없이
      // 애니메이션 끝나면 마지막 프레임에서 멈춤
      this.managerSprite.on('animationcomplete-manager', () => {
        this.managerSprite.setFrame(5); // 마지막 프레임(0~5)
      }, this);
      // === 운영진 등장 효과음 랜덤 재생 ===
      const sfxList = this.SFX_MAP['manager'];
      if (sfxList && Array.isArray(sfxList)) {
        let sfxPath = '';
        if (sfxList.length > 0) {
          sfxPath = sfxList[Math.floor(Math.random() * sfxList.length)];
        }
        if (sfxPath) {
          const audio = new Audio(sfxPath);
          audio.volume = 1.0;
          audio.play();
          console.log('[DEBUG] GameScene.ts : manager SFX 재생 중...');
        }
      }
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
      // deathplayer 텍스트
      const deathText = this.add.text(player.x, player.y - 200 * scaleFactor, `💀 ${reason}`, {
        fontSize: `${Math.max(14, 16 * scaleFactor)}px`,
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5 * scaleFactor, y: 2 * scaleFactor }
      }).setOrigin(0.5);
      this.time.delayedCall(3000, () => {
        deathText.destroy();
      });
      // 의자 제거
      const playerIndex = Array.from(this.players.keys()).indexOf(socketId);
      const chair = this.chairMap.get(playerIndex);
      if (chair) {
        chair.destroy();
        this.chairMap.delete(playerIndex);
      }
    }
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    this.setupPlayerPositions();
    this.setupAllDesksAndChairs();
    this.setupManagerArea();
    // 필요하다면 추가로 UI/플레이어 등도 재배치
  }
}