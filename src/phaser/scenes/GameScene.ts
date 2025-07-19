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
  commitGauge: number;
  flowGauge: number;
  commitCount: number;
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
  private commitBar!: Phaser.GameObjects.Rectangle;
  private commitBarBg!: Phaser.GameObjects.Rectangle;
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
    
    // 테스트용 이미지 로드
    this.load.image('test-image', '/src/assets/img/example1.png');
  }

  create() {
    // 배경 설정
    this.add.image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, this.scale.height);

    // 테스트용 이미지 표시 (화면 중앙)
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'test-image')
      .setScale(0.5)
      .setName('test-image');

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
    // Flow Gauge
    this.focusBarBg = this.add.rectangle(20, 20, 200, 20, 0x222222).setOrigin(0, 0);
    this.focusBar = this.add.rectangle(20, 20, 200, 20, 0x00aaff).setOrigin(0, 0);
    
    // Commit Gauge
    this.commitBarBg = this.add.rectangle(20, 50, 200, 15, 0x222222).setOrigin(0, 0);
    this.commitBar = this.add.rectangle(20, 50, 0, 15, 0x00ff00).setOrigin(0, 0);
    
    // 게이지 라벨
    this.add.text(230, 25, 'Flow', { 
      fontSize: '14px', 
      color: '#ffffff' 
    });
    
    this.add.text(230, 55, 'Commit', { 
      fontSize: '14px', 
      color: '#ffffff' 
    });
    
    // 플레이어 수 표시
    this.add.text(20, 80, 'Players: 0', { 
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

    // 운영진 등장 애니메이션 (400ms 동안 재생)
    this.anims.create({
      key: 'manager-appear',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }), 
      frameRate: 10, // 400ms / 4프레임 = 10fps
      repeat: 0 // 한 번만 재생
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
      this.showPushAnimation(data.socketId);
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

    // M : 운영진 등장 모션 보기
    this.input.keyboard?.on('keydown-M', () => {
      this.showManagerAppearAnimation();
    });
  }

  setupPlayerPositions() {
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

    // 로컬 플레이어의 게이지 업데이트
    const localPlayer = gameState.players.find(p => p.socketId === this.localPlayerId);
    if (localPlayer) {
      // 몰입 게이지 (Flow Gauge) 업데이트
      this.focusGaugeValue = localPlayer.flowGauge || 100;
      this.focusBar.width = (this.focusGaugeValue / 100) * 200;
      
      // 커밋 게이지 (Commit Gauge) 업데이트
      const commitGaugePercent = (localPlayer.commitGauge / 100) * 200;
      this.commitBar.width = commitGaugePercent;
      
      console.log(`🎮 Local player gauges - Flow: ${localPlayer.flowGauge}, Commit: ${localPlayer.commitGauge}, Commits: ${localPlayer.commitCount}`);
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
    // 백엔드에서 게이지를 관리하므로 로컬 업데이트 제거
    // 게이지 업데이트는 gameStateUpdate 이벤트에서 처리됨
  }

  // 운영진 등장 애니메이션 표시
  showManagerAppearAnimation() {
    // 화면 위쪽 중앙에 운영진 스프라이트 생성
    const managerSprite = this.add.sprite(
      this.scale.width / 2, 
      100, // 화면 위쪽
      'player'
    ).setScale(0.8);

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
      player.setTint(0xff0000); // 빨간색으로 표시
      
      // 사망 이유 표시
      const deathText = this.add.text(player.x, player.y - 200, `💀 ${reason}`, {
        fontSize: '16px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
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
      const successText = this.add.text(player.x, player.y - 200, `✅ Commit #${commitCount}!`, {
        fontSize: '16px',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5);

      // 2초 후 텍스트 제거
      this.time.delayedCall(2000, () => {
        successText.destroy();
      });
    }
  }

  // Push 애니메이션 표시
  showPushAnimation(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      const pushText = this.add.text(player.x, player.y - 200, '🚀 PUSHING...', {
        fontSize: '16px',
        color: '#ffff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5);

      // 500ms 후 텍스트 제거 (백엔드 PUSH_ANIMATION_DURATION_MS와 동일)
      this.time.delayedCall(500, () => {
        pushText.destroy();
      });
    }
  }

  // Push 실패 표시
  showPushFailed(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      const failText = this.add.text(player.x, player.y - 200, '❌ PUSH FAILED!', {
        fontSize: '16px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5);

      // 2초 후 텍스트 제거
      this.time.delayedCall(2000, () => {
        failText.destroy();
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