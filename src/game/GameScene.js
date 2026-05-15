import Phaser from 'phaser';

const BOARD_W = 360;
const BOARD_H = 640;
const GROUND_H = 80;
const PIPE_WIDTH = 64;
const PIPE_HEIGHT = 512;
const PIPE_GAP = BOARD_H / 4; // 160 — matches docs openingSpace
const PIPE_SPEED = -120; // -2 px/frame at 60fps
const GRAVITY = 1400; // matches docs: gravity=0.4/frame at 60fps ≈ 1464px/s²
const FLAP_VELOCITY = -360;
const BIRD_X = BOARD_W / 8; // 45 — matches docs
const PIPE_SPAWN_MS = 1500;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ASSET LOADING
  // ═══════════════════════════════════════════════════════════════════

  preload() {
    this.load.image('bird0', 'assets/flappybird0.png');
    this.load.image('bird1', 'assets/flappybird1.png');
    this.load.image('bird2', 'assets/flappybird2.png');
    this.load.image('bird3', 'assets/flappybird3.png');
    this.load.image('pipeBody', 'assets/bottompipe.png');
    this.load.image('background', 'assets/flappybirdbg.png');
    this.load.audio('bgm', 'assets/bgm_mario.mp3');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SCENE CREATE
  // ═══════════════════════════════════════════════════════════════════

  create() {
    // Background
    this.bg = this.add.image(BOARD_W / 2, BOARD_H / 2, 'background');
    this.bg.setDisplaySize(BOARD_W, BOARD_H);
    this.bg.setDepth(0);

    // Ground scroll tile — generate from pipe texture bottom section
    this.createGround();

    // Bird
    this.birdFrames = ['bird0', 'bird1', 'bird2', 'bird3'];
    this.birdFrameIdx = 0;
    this.birdFrameTimer = 0;
    this.bird = this.physics.add.sprite(BIRD_X, BOARD_H / 2, 'bird0');
    this.bird.setDisplaySize(34, 24);
    this.bird.setDepth(3);
    this.bird.setCollideWorldBounds(false);
    this.bird.body.setSize(24, 18);
    this.bird.body.setOffset(
      (this.bird.width - 24) / 2,
      (this.bird.height - 18) / 2
    );
    this.bird.body.allowGravity = false;

    // Pipes
    this.pipes = this.physics.add.group({ allowGravity: false });

    // Audio — BGM
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.25 });

    // SFX generated via Web Audio
    this.sfx = this.createSFX();

    // Input
    this.input.on('pointerdown', () => this.handleInput());
    this.input.keyboard.on('keydown-SPACE', () => this.handleInput());
    this.input.keyboard.on('keydown-UP', () => this.handleInput());
    this.input.keyboard.on('keydown-X', () => this.handleInput());

    // State
    this.isPlaying = false;
    this.isGameOver = false;
    this.score = 0;

    this.game.events.on('start-game', () => this.startGame());

    // Pre-game idle animation
    this.preGameBob();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GROUND
  // ═══════════════════════════════════════════════════════════════════

  createGround() {
    this.groundTile = this.add.tileSprite(
      BOARD_W / 2, BOARD_H - GROUND_H / 2,
      BOARD_W, GROUND_H,
      'pipeBody'
    );
    this.groundTile.setDisplaySize(BOARD_W, GROUND_H);
    this.groundTile.setDepth(2);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SOUND EFFECTS (generated)
  // ═══════════════════════════════════════════════════════════════════

  createSFX() {
    const ctx = this.sound.context;
    if (!ctx) return {};

    // ── 8-bit sound engine ──────────────────────────────────────────

    const play8Bit = (config) => {
      try {
        const t = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(config.vol || 0.1, t);
        masterGain.connect(ctx.destination);

        // Square channel (pulse wave — the heart of 8-bit)
        if (config.square) {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(1, t);
          config.square.forEach(note => {
            osc.frequency.setValueAtTime(note.freq, t + note.at);
            if (note.rampTo) {
              osc.frequency.linearRampToValueAtTime(note.rampTo, t + note.rampAt);
            }
          });
          gain.gain.setValueAtTime(1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + config.duration);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + config.duration + 0.05);
        }

        // Triangle channel (bass body)
        if (config.triangle) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.6, t);
          config.triangle.forEach(note => {
            osc.frequency.setValueAtTime(note.freq, t + note.at);
          });
          gain.gain.exponentialRampToValueAtTime(0.001, t + config.duration * 0.7);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + config.duration + 0.05);
        }

        // Noise channel (percussion / explosion)
        if (config.noiseDuration) {
          const bufferSize = ctx.sampleRate * config.noiseDuration;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.5, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, t + config.noiseDuration);
          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.setValueAtTime(800, t);
          noiseFilter.frequency.exponentialRampToValueAtTime(200, t + config.noiseDuration);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(masterGain);
          noise.start(t);
          noise.stop(t + config.noiseDuration + 0.05);
        }
      } catch (_) { /* audio unavailable */ }
    };

    // ── SFX definitions ─────────────────────────────────────────────

    return {
      // Classic NES-style jump "boop" — quick upward sweep
      flap: () => play8Bit({
        vol: 0.09,
        duration: 0.1,
        square: [
          { freq: 350, at: 0, rampTo: 700, rampAt: 0.08 },
        ],
        triangle: [
          { freq: 175, at: 0 },
        ],
      }),

      // Mario-style coin "bling" — two bright arpeggiated notes
      score: () => play8Bit({
        vol: 0.1,
        duration: 0.18,
        square: [
          { freq: 988, at: 0 },       // B5
          { freq: 1319, at: 0.07 },   // E6
        ],
        triangle: [
          { freq: 659, at: 0 },       // E5
          { freq: 988, at: 0.07 },    // B5
        ],
      }),

      // NES death "bzzzt-descend" — pitch crash + noise burst
      hit: () => play8Bit({
        vol: 0.12,
        duration: 0.45,
        noiseDuration: 0.25,
        square: [
          { freq: 600, at: 0, rampTo: 80, rampAt: 0.35 },
        ],
        triangle: [
          { freq: 300, at: 0, rampTo: 40, rampAt: 0.3 },
        ],
      }),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INPUT
  // ═══════════════════════════════════════════════════════════════════

  handleInput() {
    if (this.isGameOver) {
      // Reset on any key when game over — matches docs behaviour
      this.game.events.emit('restart-game');
      return;
    }

    if (!this.isPlaying) {
      // First tap starts the game
      this.game.events.emit('start-game');
      // Apply the flap immediately
      this.time.delayedCall(50, () => this.flap());
      return;
    }

    this.flap();
  }

  flap() {
    if (!this.isPlaying || this.isGameOver) return;

    this.bird.body.setVelocityY(FLAP_VELOCITY);

    // Flap SFX
    if (this.sfx.flap) this.sfx.flap();

    // Visual squash
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

    // Cancel pending game-over modal if player restarted before it fired
    if (this.gameOverTimer) {
      this.gameOverTimer.remove();
      this.gameOverTimer = null;
    }

    this.bird.setPosition(BIRD_X, BOARD_H / 2);
    this.bird.setAngle(0);
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

    // Hit SFX
    if (this.sfx.hit) this.sfx.hit();

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
  //  PIPE SPAWNING  (matches docs placePipes logic)
  // ═══════════════════════════════════════════════════════════════════

  spawnPipePair() {
    // randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2)
    // pipeY = 0 at top, pipeHeight = 512
    // Range: -128 to -384  (so top pipe extends off-screen at top)
    const randomPipeY = -PIPE_HEIGHT / 4 - Math.random() * (PIPE_HEIGHT / 2);
    const openingSpace = PIPE_GAP; // 160

    // Top pipe — flipped, extends upward
    const topPipe = this.pipes.create(BOARD_W + 40, randomPipeY, 'pipeBody');
    topPipe.setOrigin(0.5, 1);
    topPipe.setFlipY(true);
    topPipe.setDisplaySize(PIPE_WIDTH, PIPE_HEIGHT);
    topPipe.setDepth(1);
    topPipe.body.setAllowGravity(false);
    topPipe.body.setVelocityX(PIPE_SPEED);
    topPipe.body.setImmovable(true);

    // Bottom pipe — extends downward
    const bottomY = randomPipeY + PIPE_HEIGHT + openingSpace;
    const bottomPipe = this.pipes.create(BOARD_W + 40, bottomY, 'pipeBody');
    bottomPipe.setOrigin(0.5, 0);
    bottomPipe.setDisplaySize(PIPE_WIDTH, PIPE_HEIGHT);
    bottomPipe.setDepth(1);
    bottomPipe.body.setAllowGravity(false);
    bottomPipe.body.setVelocityX(PIPE_SPEED);
    bottomPipe.body.setImmovable(true);

    const pair = { scored: false };
    topPipe.pipeData = pair;
    bottomPipe.pipeData = pair;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRE-GAME BOB
  // ═══════════════════════════════════════════════════════════════════

  preGameBob() {
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
  //  UPDATE LOOP
  // ═══════════════════════════════════════════════════════════════════

  update(_time, delta) {
    // Ground scroll
    this.groundTile.tilePositionX += 1.2;

    // Bird wing animation  (cycle frames every ~100ms)
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

    // Bird tilt
    const vy = this.bird.body.velocity.y;
    this.bird.angle = Phaser.Math.Clamp(vy * 0.1, -25, 90);

    // Ceiling clamp — matches docs: Math.max(bird.y + velocityY, 0)
    const birdHalfH = this.bird.displayHeight / 2;
    if (this.bird.y - birdHalfH < 0) {
      this.bird.y = birdHalfH;
      if (this.bird.body.velocity.y < 0) this.bird.body.velocity.y = 0;
    }

    // Floor check — bird bottom edge hits ground top  (docs: bird.y > board.height)
    if (this.bird.y + birdHalfH > BOARD_H - GROUND_H) {
      this.endGame();
      return;
    }

    // Pipe spawner  (docs: setInterval 1500ms)
    this.pipeTimer += delta;
    if (this.pipeTimer >= PIPE_SPAWN_MS) {
      this.pipeTimer -= PIPE_SPAWN_MS;
      this.spawnPipePair();
    }

    // Pipe cleanup + scoring  (docs: score += 0.5 per pipe)
    const children = this.pipes.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const pipe = children[i];

      // Cleanup off-screen pipes  (docs: pipeArray[0].x < -pipeWidth)
      if (pipe.x < -PIPE_WIDTH - 20) {
        pipe.destroy();
        continue;
      }

      // Scoring  (docs: bird.x > pipe.x + pipe.width, score += 0.5)
      if (
        pipe.pipeData &&
        !pipe.pipeData.scored &&
        this.bird.x > pipe.x + pipe.displayWidth / 2
      ) {
        pipe.pipeData.scored = true;
        this.score += 0.5;

        // SFX on whole-number scores (each full pipe pair)
        if (this.score === Math.floor(this.score) && this.sfx.score) {
          this.sfx.score();
        }

        this.game.events.emit('update-score', Math.floor(this.score));
      }
    }

    // Collision  (docs: AABB detectCollision)
    this.physics.overlap(this.bird, this.pipes, () => {
      this.endGame();
    });
  }
}
