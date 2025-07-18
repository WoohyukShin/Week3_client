// src/phaser/scenes/GameScene.ts
import Phaser from 'phaser';
import socket from '../../services/socket';

export default class GameScene extends Phaser.Scene {
  private focusGaugeValue: number = 100;
  private focusBar!: Phaser.GameObjects.Rectangle;
  private focusBarBg!: Phaser.GameObjects.Rectangle;
  private player!: Phaser.GameObjects.Sprite;
  private readonly FLOW_GAUGE_DECREASE_PER_TICK = 10;

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
    this.add.image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, this.scale.height);

    this.focusBarBg = this.add.rectangle(20, 20, 200, 20, 0x222222).setOrigin(0, 0);
    this.focusBar = this.add.rectangle(20, 20, 200, 20, 0x00aaff).setOrigin(0, 0);

    this.player = this.add.sprite(400, 300, 'player', 0);

    this.anims.create({
      key: 'dance',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }), 
      frameRate: 8,
      repeat: -1
    });

    this.setupSocketListeners();
    this.setupInput();
  }

  update(time: number, delta: number) {
    const decayAmount = (delta / 1000) * this.FLOW_GAUGE_DECREASE_PER_TICK;
    this.focusGaugeValue -= decayAmount;
    this.focusGaugeValue = Phaser.Math.Clamp(this.focusGaugeValue, 0, 100);

    const width = 2 * this.focusGaugeValue;
    const color = this.focusGaugeValue > 50 ? 0x87cefa : 0x0070ff;

    this.focusBar.setSize(width, 20);
    this.focusBar.setFillStyle(color);
  }

  setupSocketListeners() {
    socket.on('gameStateUpdate', (gameState) => {
      console.log('GameState Update:', gameState);
    });
    
  }

  setupInput() {
    this.input.keyboard?.on('keydown-SPACE', () => {
      socket.emit('playerAction', { action: 'startDancing' });

      this.player.anims.play('dance', true);
    });

    this.input.keyboard?.on('keyup-SPACE', () => {
      socket.emit('playerAction', { action: 'stopDancing' });

      this.player.anims.stop();
      this.player.setFrame(0);
    });
  }
}