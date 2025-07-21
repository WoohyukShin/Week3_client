
import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Sprite {
  public id: number;
  public username: string;
  public isAlive: boolean = true;
  public isDancing: boolean = false;
  public commitGauge: number = 0;
  public flowGauge: number = 100;
  public commitCount: number = 0;
  public bumpercar: boolean = false;

  public skillName: string = ""; // 스킬 이름. 게임 시작 시 서버한테 받음.
  public muscleGauge: number = 0;
  

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