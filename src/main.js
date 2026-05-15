import Phaser from 'phaser';
import { GameScene } from './game/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

// ─── DOM refs ────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const startScreen = $('#start-screen');
const scoreDisplay = $('#score-display');
const gameOverModal = $('#game-over-modal');
const scoreEl = $('#score');
const finalScoreEl = $('#final-score');
const bestScoreEl = $('#best-score');

// ─── Persisted best score ────────────────────────────────────────────

let bestScore = 0;
try {
  bestScore = parseInt(localStorage.getItem('flappyBirdProBest') || '0', 10) || 0;
} catch (_) { /* localStorage unavailable */ }
bestScoreEl.textContent = bestScore;

// ─── State helpers ───────────────────────────────────────────────────

function showStartScreen() {
  startScreen.classList.remove('hidden');
  scoreDisplay.classList.add('hidden');
  gameOverModal.classList.add('hidden');
}

function showPlaying() {
  startScreen.classList.add('hidden');
  scoreDisplay.classList.remove('hidden');
  gameOverModal.classList.add('hidden');
}

function showGameOver(score) {
  scoreDisplay.classList.add('hidden');
  gameOverModal.classList.remove('hidden');
  finalScoreEl.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    try { localStorage.setItem('flappyBirdProBest', String(bestScore)); } catch (_) {}
    bestScoreEl.textContent = bestScore;
  } else {
    bestScoreEl.textContent = bestScore;
  }
}

// ─── Button handlers ─────────────────────────────────────────────────

$('#start-btn').addEventListener('click', () => {
  showPlaying();
  game.events.emit('start-game');
});

$('#restart-btn').addEventListener('click', () => {
  showPlaying();
  game.events.emit('start-game');
});

// ─── Game → DOM events ───────────────────────────────────────────────

game.events.on('update-score', (score) => {
  scoreEl.textContent = score;
});

game.events.on('game-over', (score) => {
  showGameOver(score);
});

// ─── Keyboard restart while game-over modal is visible ──────────────

game.events.on('restart-game', () => {
  showPlaying();
  game.events.emit('start-game');
});
