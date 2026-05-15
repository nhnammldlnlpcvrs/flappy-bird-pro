import Phaser from 'phaser';

const BOARD_W = 360;
const BOARD_H = 640;
const GROUND_H = 80;
const PIPE_WIDTH = 64;
const PIPE_HEIGHT = 512;
const PIPE_GAP = BOARD_H / 4; // 160 — matches archive openingSpace
const PIPE_SPEED = -120;      // archive: velocityX = -2 px/frame at 60fps
const GRAVITY = 1440;         // archive: gravity = 0.4 px/frame² → 1440 px/s²
const FLAP_VELOCITY = -360;   // archive: velocityY = -6 px/frame at 60fps
const BIRD_X = BOARD_W / 8;   // 45 — matches archive
const PIPE_SPAWN_MS = 1500;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ASSET LOADING
  // ═══════════════════════════════════════════════════════════════════

  preload() {
    // Bird frames
    this.load.image('bird0', 'assets/flappybird0.png');
    this.load.image('bird1', 'assets/flappybird1.png');
    this.load.image('bird2', 'assets/flappybird2.png');
    this.load.image('bird3', 'assets/flappybird3.png');
    // Pipes — separate images as in archive
    this.load.image('pipeTop', 'assets/toppipe.png');
    this.load.image('pipeBottom', 'assets/bottompipe.png');
    // Background
    this.load.image('background', 'assets/flappybirdbg.png');
    // Audio — BGM
    this.load.audio('bgm', 'assets/bgm_mario.mp3');
    // Audio — SFX (WAV files from archive)
    this.load.audio('sfxFlap', 'assets/sfx_swooshing.wav');
    this.load.audio('sfxScore', 'assets/sfx_point.wav');
    this.load.audio('sfxHit', 'assets/sfx_hit.wav');
    this.load.audio('sfxDie', 'assets/sfx_die.wav');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SCENE CREATE
  // ═══════════════════════════════════════════════════════════════════

  create() {
    // Background
    this.bg = this.add.image(BOARD_W / 2, BOARD_H / 2, 'background');
    this.bg.setDisplaySize(BOARD_W, BOARD_H);
    this.bg.setDepth(0);

    // Ground scroll tile
    this.groundTile = this.add.tileSprite(
      BOARD_W / 2, BOARD_H - GROUND_H / 2,
      BOARD_W, GROUND_H,
      'pipeBottom'
    );
    this.groundTile.setDisplaySize(BOARD_W, GROUND_H);
    this.groundTile.setDepth(2);

    // Bird
    this.birdFrames = ['bird0', 'bird1', 'bird2', 'bird3'];
    this.birdFrameIdx = 0;
    this.birdFrameTimer = 0;
    this.bird = this.physics.add.sprite(BIRD_X, BOARD_H / 2, 'bird0');
    this.bird.setDisplaySize(34, 24);
    this.bird.setDepth(3);
    this.bird.setCollideWorldBounds(false);
    this.bird.body.setSize(34, 24);
    this.bird.body.setOffset(
      (this.bird.width - 34) / 2,
      (this.bird.height - 24) / 2
    );
    this.bird.body.allowGravity = false;

    // Pipes
    this.pipes = this.physics.add.group({ allowGravity: false });

    // Audio — BGM
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.25 });

    // Audio — SFX (loaded WAV files from archive)
    this.sfxFlap = this.sound.add('sfxFlap', { volume: 0.3 });
    this.sfxScore = this.sound.add('sfxScore', { volume: 0.35 });
    this.sfxHit = this.sound.add('sfxHit', { volume: 0.4 });
    this.sfxDie = this.sound.add('sfxDie', { volume: 0.4 });

    // Input — matches archive: Space, ArrowUp, KeyX
    this.input.on('pointerdown', () => this.handleInput());
    this.input.keyboard.on('keydown-SPACE', () => this.handleInput());
    this.input.keyboard.on('keydown-UP', () => this.handleInput());
    this.input.keyboard.on('keydown-X', () => this.handleInput());

    // State
    this.isPlaying = false;
    this.isGameOver = false;
    this.score = 0;

    this.game.events.on('start-game', () => this.startGame());

    // Pre-game idle bobbing animation
    this.bobTween = this.tweens.add({
      targets: this.bird,
      y: this.bird.y + 10,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INPUT — matches archive moveBird()
  // ═══════════════════════════════════════════════════════════════════

  handleInput() {
    if (this.isGameOver) {
      // Reset on any input when game over — matches archive
      this.game.events.emit('restart-game');
      return;
    }

    if (!this.isPlaying) {
      // First input starts the game and applies a flap
      this.game.events.emit('start-game');
      this.time.delayedCall(50, () => this.flap());
      return;
    }

    this.flap();
  }

  flap() {
    if (!this.isPlaying || this.isGameOver) return;

    // archive: velocityY = -6
    this.bird.body.setVelocityY(FLAP_VELOCITY);

    // Flap SFX — archive swooshing sound
    if (this.sfxFlap) this.sfxFlap.play();

    // Visual squash/stretch
    this.tweens.add({
      targets: this.bird,
      scaleY: 0.65,
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GAME LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════

  startGame() {
    this.score = 0;
    this.isPlaying = true;
    this.isGameOver = false;

    if (this.gameOverTimer) {
      this.gameOverTimer.remove();
      this.gameOverTimer = null;
    }

    // archive: bird.y = birdY (boardHeight/2)
    this.bird.setPosition(BIRD_X, BOARD_H / 2);
    this.bird.setAngle(0);
    this.bird.clearTint();
    this.bird.setTexture('bird0');
    this.bird.setDisplaySize(34, 24);
    this.bird.body.allowGravity = true;
    this.bird.body.setGravityY(GRAVITY);
    this.bird.body.setVelocity(0, 0);

    if (this.bobTween) this.bobTween.stop();
    this.pipes.clear(true, true);

    this.pipeTimer = 0;

    // BGM
    if (this.bgm && !this.bgm.isPlaying) this.bgm.play();

    this.game.events.emit('update-score', 0);
  }

  endGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isPlaying = false;

    this.bird.body.setGravityY(0);
    this.bird.body.allowGravity = false;
    this.bird.body.setVelocity(0, 0);

    // Hit SFX — archive die sound
    if (this.sfxHit) this.sfxHit.play();
    // Death sound
    if (this.sfxDie) {
      this.time.delayedCall(80, () => { if (this.sfxDie) this.sfxDie.play(); });
    }

    if (this.bgm && this.bgm.isPlaying) this.bgm.stop();

    // Visual feedback
    this.bird.setTint(0xFF4444);
    this.time.delayedCall(300, () => this.bird.clearTint());
    this.cameras.main.shake(250, 0.01);

    // Freeze pipes
    this.pipes.getChildren().forEach(p => {
      p.body.setVelocity(0, 0);
    });

    this.gameOverTimer = this.time.delayedCall(500, () => {
      this.game.events.emit('game-over', this.score);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PIPE SPAWNING — matches archive placePipes()
  // ═══════════════════════════════════════════════════════════════════

  spawnPipePair() {
    // archive: randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2)
    // pipeY = 0 at top, pipeHeight = 512
    // Range: -128 (pipeHeight/4) to -384 (pipeHeight/4 + pipeHeight/2)
    const randomPipeY = -PIPE_HEIGHT / 4 - Math.random() * (PIPE_HEIGHT / 2);
    const openingSpace = PIPE_GAP; // 160 — archive: board.height/4

    // Top pipe — uses toppipe.png from archive, origin at bottom so it extends upward
    const topPipe = this.pipes.create(BOARD_W + 40, randomPipeY, 'pipeTop');
    topPipe.setOrigin(0.5, 1);
    topPipe.setDisplaySize(PIPE_WIDTH, PIPE_HEIGHT);
    topPipe.body.setSize(PIPE_WIDTH, PIPE_HEIGHT);
    topPipe.setDepth(1);
    topPipe.body.setAllowGravity(false);
    topPipe.body.setVelocityX(PIPE_SPEED);
    topPipe.body.setImmovable(true);

    // Bottom pipe — uses bottompipe.png from archive, origin at top so it extends downward
    const bottomY = randomPipeY + PIPE_HEIGHT + openingSpace;
    const bottomPipe = this.pipes.create(BOARD_W + 40, bottomY, 'pipeBottom');
    bottomPipe.setOrigin(0.5, 0);
    bottomPipe.setDisplaySize(PIPE_WIDTH, PIPE_HEIGHT);
    bottomPipe.body.setSize(PIPE_WIDTH, PIPE_HEIGHT);
    bottomPipe.setDepth(1);
    bottomPipe.body.setAllowGravity(false);
    bottomPipe.body.setVelocityX(PIPE_SPEED);
    bottomPipe.body.setImmovable(true);

    // Shared scoring data — archive: score += 0.5 per pipe
    const pair = { scored: false };
    topPipe.pipeData = pair;
    bottomPipe.pipeData = pair;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE LOOP — matches archive update()
  // ═══════════════════════════════════════════════════════════════════

  update(_time, delta) {
    // Ground scroll
    this.groundTile.tilePositionX += 1.2;

    // Bird wing animation — cycle frames every ~100ms
    if (this.isPlaying || !this.isGameOver) {
      this.birdFrameTimer += delta;
      if (this.birdFrameTimer >= 100) {
        this.birdFrameTimer -= 100;
        this.birdFrameIdx = (this.birdFrameIdx + 1) % 4;
        this.bird.setTexture(this.birdFrames[this.birdFrameIdx]);
        this.bird.setDisplaySize(34, 24);
      }
    }

    if (!this.isPlaying) return;

    // Bird tilt based on velocity
    const vy = this.bird.body.velocity.y;
    this.bird.angle = Phaser.Math.Clamp(vy * 0.1, -25, 90);

    // Ceiling clamp — archive: Math.max(bird.y + velocityY, 0)
    const birdHalfH = this.bird.displayHeight / 2;
    if (this.bird.y - birdHalfH < 0) {
      this.bird.y = birdHalfH;
      if (this.bird.body.velocity.y < 0) this.bird.body.velocity.y = 0;
    }

    // Floor check — archive: bird.y > board.height
    if (this.bird.y + birdHalfH > BOARD_H - GROUND_H) {
      this.endGame();
      return;
    }

    // Pipe spawner — archive: setInterval(placePipes, 1500)
    this.pipeTimer += delta;
    if (this.pipeTimer >= PIPE_SPAWN_MS) {
      this.pipeTimer -= PIPE_SPAWN_MS;
      this.spawnPipePair();
    }

    // Pipe cleanup + scoring — archive logic
    const children = this.pipes.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const pipe = children[i];

      // Cleanup off-screen — archive: pipeArray[0].x < -pipeWidth
      if (pipe.x < -PIPE_WIDTH - 20) {
        pipe.destroy();
        continue;
      }

      // Scoring — archive: bird.x > pipe.x + pipe.width, score += 0.5
      if (
        pipe.pipeData &&
        !pipe.pipeData.scored &&
        this.bird.x > pipe.x + pipe.displayWidth / 2
      ) {
        pipe.pipeData.scored = true;
        this.score += 0.5;

        // SFX on whole-number scores — archive point sound
        if (this.score === Math.floor(this.score) && this.sfxScore) {
          this.sfxScore.play();
        }

        this.game.events.emit('update-score', Math.floor(this.score));
      }
    }

    // Collision — archive: detectCollision (AABB)
    this.physics.overlap(this.bird, this.pipes, () => {
      this.endGame();
    });
  }
}
