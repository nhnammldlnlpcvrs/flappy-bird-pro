import Phaser from 'phaser';

const WORLD_W = 400;
const WORLD_H = 600;
const GROUND_H = 80;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = -150;
const PIPE_SPAWN_INTERVAL = 1600;
const BIRD_X = 100;
const GRAVITY = 900;
const FLAP_VELOCITY = -360;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#4EC0CA');

    this.generateTextures();
    this.createBackground();
    this.createBird();
    this.createGround();
    this.createPipePool();
    this.setupInput();

    this.isPlaying = false;
    this.isGameOver = false;
    this.score = 0;

    this.game.events.on('start-game', () => this.startGame());

    this.preGameBob();
  }

  // ─── Texture Generation ─────────────────────────────────────────

  generateTextures() {
    // Bird — yellow circle body, orange wing, white eye, orange beak
    if (!this.textures.exists('bird')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xFFD700);
      g.fillCircle(16, 14, 14);
      g.fillStyle(0xFFA500);
      g.fillEllipse(10, 17, 12, 7);
      g.fillStyle(0xFFFFFF);
      g.fillCircle(23, 9, 5);
      g.fillStyle(0x000000);
      g.fillCircle(24, 9, 2.5);
      g.fillStyle(0xFF4500);
      g.fillTriangle(29, 12, 38, 15, 29, 18);
      g.generateTexture('bird', 40, 30);
      g.destroy();
    }

    // Pipe — green body, darker cap, highlight stripe
    if (!this.textures.exists('pipe')) {
      const g = this.make.graphics({ add: false });
      const w = PIPE_WIDTH;
      const h = 500;
      g.fillStyle(0x73BF2E);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x8ED14B);
      g.fillRect(10, 0, 8, h);
      g.lineStyle(2, 0x4A8C1C);
      g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle(0x5CA022);
      g.fillRect(-4, 0, w + 8, 30);
      g.lineStyle(2, 0x3D7A14);
      g.strokeRect(-4, 0, w + 8, 30);
      g.generateTexture('pipe', w + 8, h);
      g.destroy();
    }

    // Ground tile — brown dirt with green grass on top
    if (!this.textures.exists('ground')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xDED895);
      g.fillRect(0, 10, 100, 70);
      g.fillStyle(0x73BF2E);
      g.fillRect(0, 0, 100, 15);
      g.fillStyle(0x5CA022);
      g.fillRect(0, 0, 100, 4);
      g.generateTexture('ground', 100, 80);
      g.destroy();
    }
  }

  // ─── Background ──────────────────────────────────────────────────

  createBackground() {
    // Decorative clouds
    for (let i = 0; i < 4; i++) {
      const cx = Phaser.Math.Between(40, 360);
      const cy = Phaser.Math.Between(30, 180);
      const cloud = this.add.graphics();
      cloud.fillStyle(0xFFFFFF, 0.5);
      cloud.fillEllipse(cx, cy, 60, 25);
      cloud.fillEllipse(cx + 28, cy - 8, 40, 20);
      cloud.fillEllipse(cx - 22, cy - 4, 35, 18);
      cloud.setDepth(0);
    }

    // Buildings in background (parallax-ish)
    for (let i = 0; i < 5; i++) {
      const bx = i * 80 + 20;
      const bh = Phaser.Math.Between(40, 100);
      const by = WORLD_H - GROUND_H - bh + 10;
      const bldg = this.add.graphics();
      bldg.fillStyle(0x8FBC8F, 0.4);
      bldg.fillRect(bx - 10, by, 40, bh);
      bldg.setDepth(0);
    }
  }

  // ─── Bird ────────────────────────────────────────────────────────

  createBird() {
    this.bird = this.physics.add.sprite(BIRD_X, WORLD_H / 2, 'bird');
    this.bird.setDepth(3);
    this.bird.setCollideWorldBounds(false);
    this.bird.body.setSize(22, 20);
    this.bird.body.setOffset(8, 5);
    this.bird.body.allowGravity = false;
  }

  preGameBob() {
    this.bobTween = this.tweens.add({
      targets: this.bird,
      y: this.bird.y + 12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── Ground ──────────────────────────────────────────────────────

  createGround() {
    this.groundTile = this.add.tileSprite(
      WORLD_W / 2, WORLD_H - GROUND_H / 2,
      WORLD_W, GROUND_H,
      'ground'
    );
    this.groundTile.setDepth(2);
  }

  // ─── Pipes ───────────────────────────────────────────────────────

  createPipePool() {
    this.pipes = this.physics.add.group({ allowGravity: false });
  }

  spawnPipePair() {
    const minY = 80;
    const maxY = WORLD_H - GROUND_H - 80;
    const halfGap = PIPE_GAP / 2;
    const centerY = Phaser.Math.Between(minY + halfGap, maxY - halfGap);

    const topY = centerY - halfGap;
    const bottomY = centerY + halfGap;

    // Top pipe — flipped, extends upward from topY
    const top = this.pipes.create(WORLD_W + 40, topY, 'pipe');
    top.setOrigin(0.5, 1);
    top.setFlipY(true);
    top.setDepth(1);
    top.body.setAllowGravity(false);
    top.body.setVelocityX(PIPE_SPEED);
    top.body.setImmovable(true);

    // Bottom pipe — extends downward from bottomY
    const bottom = this.pipes.create(WORLD_W + 40, bottomY, 'pipe');
    bottom.setOrigin(0.5, 0);
    bottom.setDepth(1);
    bottom.body.setAllowGravity(false);
    bottom.body.setVelocityX(PIPE_SPEED);
    bottom.body.setImmovable(true);

    const pair = { scored: false };
    top.pipeData = pair;
    bottom.pipeData = pair;
  }

  // ─── Input ───────────────────────────────────────────────────────

  setupInput() {
    this.input.on('pointerdown', () => this.flap());
    this.input.keyboard.on('keydown-SPACE', () => this.flap());
  }

  flap() {
    if (!this.isPlaying || this.isGameOver) return;

    this.bird.body.setVelocityY(FLAP_VELOCITY);

    this.tweens.add({
      targets: this.bird,
      scaleY: 0.6,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  // ─── Game Lifecycle ──────────────────────────────────────────────

  startGame() {
    this.score = 0;
    this.isPlaying = true;
    this.isGameOver = false;

    this.bird.setPosition(BIRD_X, WORLD_H / 2);
    this.bird.setAngle(0);
    this.bird.body.allowGravity = true;
    this.bird.body.setGravityY(GRAVITY);
    this.bird.body.setVelocity(0, 0);

    if (this.bobTween) {
      this.bobTween.stop();
    }

    this.pipes.clear(true, true);

    this.pipeTimer = 0;

    this.game.events.emit('update-score', 0);
  }

  endGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isPlaying = false;

    this.bird.body.setGravityY(0);
    this.bird.body.allowGravity = false;
    this.bird.body.setVelocity(0, 0);

    this.bird.setTint(0xFF4444);
    this.time.delayedCall(300, () => this.bird.clearTint());

    this.cameras.main.shake(250, 0.008);

    this.pipes.getChildren().forEach(p => {
      p.body.setVelocity(0, 0);
    });

    this.time.delayedCall(500, () => {
      this.game.events.emit('game-over', this.score);
    });
  }

  // ─── Update Loop ─────────────────────────────────────────────────

  update(_time, delta) {
    // Ground scroll
    this.groundTile.tilePositionX += 1.5;

    if (!this.isPlaying) return;

    // Bird rotation — tilt based on vertical velocity
    const vy = this.bird.body.velocity.y;
    this.bird.angle = Phaser.Math.Clamp(vy * 0.1, -25, 90);

    // World bounds — floor and ceiling
    if (this.bird.y >= WORLD_H - GROUND_H || this.bird.y <= -10) {
      this.endGame();
      return;
    }

    // Pipe spawner
    this.pipeTimer += delta;
    if (this.pipeTimer >= PIPE_SPAWN_INTERVAL) {
      this.pipeTimer -= PIPE_SPAWN_INTERVAL;
      this.spawnPipePair();
    }

    // Pipe cleanup + scoring
    const children = this.pipes.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const pipe = children[i];
      if (pipe.x < -80) {
        pipe.destroy();
        continue;
      }

      if (pipe.pipeData && !pipe.pipeData.scored && pipe.x < BIRD_X - 20) {
        pipe.pipeData.scored = true;
        this.score++;
        this.game.events.emit('update-score', this.score);

        // Feather celebration
        this.scorePop();
      }
    }

    // Collision
    this.physics.overlap(this.bird, this.pipes, () => {
      this.endGame();
    });
  }

  scorePop() {
    const pop = this.add.text(BIRD_X + 30, this.bird.y - 20, '+1', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    });
    pop.setDepth(10);

    this.tweens.add({
      targets: pop,
      y: pop.y - 40,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => pop.destroy(),
    });
  }
}
