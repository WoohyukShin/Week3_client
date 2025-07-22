
import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Sprite {
  public id: number;
  public username: string;
  public isAlive: boolean = true;
  public playerMotion: string = 'coding';
  public flowGauge: number = 100;
  public skillName: string = "";
  public muscleGauge: number = 0;
  public muscleCount: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, id: number, username: string) {
    super(scene, x, y, texture);
    this.id = id;
    this.username = username;
    scene.add.existing(this);
  }

  updatePlayerState(data: Partial<Player>) {
    Object.assign(this, data);
  }
}