// src/phaser/scenes/GameScene.ts
import Phaser from 'phaser';
import socket from '../../services/socket';
import Player from '../object/Player';

interface GamePlayer {
  socketId: string;
  username: string;
  x: number;
  y: number;
  isDancing: boolean;
  isAlive: boolean;
}

interface GameState {
  players: GamePlayer[];
  gameStarted: boolean;
}

export default class GameScene extends Phaser.Scene {
  private players: Map<string, Player> = new Map();
  private localPlayerId: string = '';
  private gameState: GameState = { players: [], gameStarted: false };
  private focusGaugeValue: number = 100;
  private focusBar!: Phaser.GameObjects.Rectangle;
  private focusBarBg!: Phaser.GameObjects.Rectangle;
  private playerPositions: { [key: string]: { x: number; y: number } } = {};

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('background', '/src/assets/img/game_background.jpg');
    this.load.spritesheet('player', '/src/assets/img/example1.png', {
      frameWidth: 240, 
      frameHeight: 240,
    });
  }

  create() {
    // 배경 설정
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
    
    // 게임 상태 요청
    socket.emit('getGameState', {});
  }

  setupUI() {
    this.focusBarBg = this.add.rectangle(20, 20, 200, 20, 0x222222).setOrigin(0, 0);
    this.focusBar = this.add.rectangle(20, 20, 200, 20, 0x00aaff).setOrigin(0, 0);
    
    // 플레이어 수 표시
    this.add.text(20, 50, 'Players: 0', { 
      fontSize: '16px', 
      color: '#ffffff' 
    }).setName('playerCount');
  }

  setupAnimations() {
    this.anims.create({
      key: 'dance',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }), 
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }), 
      frameRate: 1,
      repeat: -1
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
  }

  setupInput() {
    // 춤추기 (스페이스바)
    this.input.keyboard?.on('keydown-SPACE', () => {
      socket.emit('playerAction', { action: 'startDancing' });
    });

    this.input.keyboard?.on('keyup-SPACE', () => {
      socket.emit('playerAction', { action: 'stopDancing' });
    });

    // 이동 (WASD)
    this.input.keyboard?.on('keydown-W', () => {
      socket.emit('playerAction', { action: 'move', payload: { direction: 'up' } });
    });

    this.input.keyboard?.on('keydown-S', () => {
      socket.emit('playerAction', { action: 'move', payload: { direction: 'down' } });
    });

    this.input.keyboard?.on('keydown-A', () => {
      socket.emit('playerAction', { action: 'move', payload: { direction: 'left' } });
    });

    this.input.keyboard?.on('keydown-D', () => {
      socket.emit('playerAction', { action: 'move', payload: { direction: 'right' } });
    });
  }

  setupPlayerPositions() {
    // 플레이어들이 화면에 고르게 배치되도록 위치 설정
    const positions = [
      { x: 200, y: 200 },
      { x: 600, y: 200 },
      { x: 200, y: 400 },
      { x: 600, y: 400 },
      { x: 400, y: 300 },
      { x: 100, y: 300 },
      { x: 700, y: 300 },
      { x: 400, y: 100 },
      { x: 400, y: 500 }
    ];

    positions.forEach((pos, index) => {
      this.playerPositions[`player_${index}`] = pos;
    });
  }

  updateGameState(gameState: GameState) {
    this.gameState = gameState;
    
    // 플레이어 수 업데이트
    const playerCountText = this.children.getByName('playerCount') as Phaser.GameObjects.Text;
    if (playerCountText) {
      playerCountText.setText(`Players: ${gameState.players.length}`);
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
    // 플레이어 위치 결정
    const position = this.getPlayerPosition(playerData.socketId);
    
    const player = new Player(
      this, 
      position.x, 
      position.y, 
      'player', 
      parseInt(playerData.socketId.slice(-4), 16), // 간단한 ID 생성
      playerData.username
    );

    // 플레이어 상태 설정
    player.isDancing = playerData.isDancing;
    player.isAlive = playerData.isAlive;
    
    // 애니메이션 설정
    if (playerData.isDancing) {
      player.anims.play('dance', true);
    } else {
      player.anims.play('idle', true);
    }

    // 사용자명 표시
    const nameText = this.add.text(position.x, position.y - 150, playerData.username, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5);

    player.setData('nameText', nameText);
    this.players.set(playerData.socketId, player);
  }

  updatePlayer(playerData: GamePlayer) {
    const player = this.players.get(playerData.socketId);
    if (!player) return;

    // 위치 업데이트
    const position = this.getPlayerPosition(playerData.socketId);
    player.setPosition(position.x, position.y);

    // 이름 텍스트 위치 업데이트
    const nameText = player.getData('nameText') as Phaser.GameObjects.Text;
    if (nameText) {
      nameText.setPosition(position.x, position.y - 150);
    }

    // 춤추기 상태 업데이트
    if (playerData.isDancing && !player.isDancing) {
      player.isDancing = true;
      player.anims.play('dance', true);
    } else if (!playerData.isDancing && player.isDancing) {
      player.isDancing = false;
      player.anims.play('idle', true);
    }

    // 생존 상태 업데이트
    player.isAlive = playerData.isAlive;
    if (!playerData.isAlive) {
      player.setTint(0xff0000); // 빨간색으로 표시
    } else {
      player.clearTint();
    }
  }

  removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      // 이름 텍스트 제거
      const nameText = player.getData('nameText') as Phaser.GameObjects.Text;
      if (nameText) {
        nameText.destroy();
      }
      
      // 플레이어 제거
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
        break;
      case 'stopDancing':
        player.isDancing = false;
        player.anims.play('idle', true);
        break;
      case 'move':
        // 이동 로직은 서버에서 처리되므로 여기서는 시각적 효과만
        break;
    }
  }

  getPlayerPosition(socketId: string): { x: number; y: number } {
    // 플레이어 순서에 따라 위치 결정
    const playerIndex = Array.from(this.players.keys()).indexOf(socketId);
    const positions = Object.values(this.playerPositions);
    
    if (playerIndex < positions.length) {
      return positions[playerIndex];
    }
    
    // 기본 위치
    return { x: 400, y: 300 };
  }

  update(_time: number, delta: number) {
    // 포커스 게이지 업데이트
    const decayAmount = (delta / 1000) * 10;
    this.focusGaugeValue -= decayAmount;
    this.focusGaugeValue = Phaser.Math.Clamp(this.focusGaugeValue, 0, 100);

    const width = 2 * this.focusGaugeValue;
    const color = this.focusGaugeValue > 50 ? 0x87cefa : 0x0070ff;

    this.focusBar.setSize(width, 20);
    this.focusBar.setFillStyle(color);
  }
}