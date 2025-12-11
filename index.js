// game.js - to'g'ri ishlaydigan va tozalangan versiya

// --- Canvas Setup ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Game Classes ---
class Player {
  constructor(game) {
    this.game = game;
    this.width = 30;
    this.height = 30;
    this.x = 50;
    this.y = this.game.groundLevel - this.height;
    this.color = "#4db8ff";
    this.velocityY = 0;
    this.isJumping = false;
    this.isGrounded = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if (this.game.shieldActive) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }

  update() {
    if (!this.isGrounded) {
      this.velocityY += this.game.physics.gravity;
    }
    this.y += this.velocityY;

    if (this.y >= this.game.groundLevel - this.height) {
      this.y = this.game.groundLevel - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
      this.isJumping = false;
    }
  }

  jump() {
    if (this.isGrounded && !this.game.gameOver) {
      this.isGrounded = false;
      this.isJumping = true;
      this.velocityY = this.game.physics.jumpForce;
    }
  }
}

class Obstacle {
  constructor(game) {
    this.game = game;
    this.width = 30;
    this.height = 30;
    this.x = canvas.width;
    this.y = this.game.groundLevel - this.height;
    this.color = "#ff4d4d";
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    const speed = this.game.timeSlowed ? this.game.obstacleSpeed / 2 : this.game.obstacleSpeed;
    this.x -= speed;
  }
}

class PowerUp {
  constructor(game) {
    this.game = game;
    this.width = 20;
    this.height = 20;
    this.x = canvas.width;
    this.y = this.game.groundLevel - this.height - Math.random() * 80 - 40;
    this.duration = 5000;
    this.type = this.getRandomType();
    this.color = this.getColorForType();
  }

  getRandomType() {
    const types = ["scoreMultiplier", "shield", "highJump", "slowTime"];
    return types[Math.floor(Math.random() * types.length)];
  }

  getColorForType() {
    switch (this.type) {
      case "scoreMultiplier": return "#ffd700";
      case "shield": return "#00bfff";
      case "highJump": return "#32cd32";
      case "slowTime": return "#8a2be2";
      default: return "#cccccc";
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    const speed = this.game.timeSlowed ? this.game.obstacleSpeed / 2 : this.game.obstacleSpeed;
    this.x -= speed;
  }
}

class Game {
  constructor() {
    this.groundLevel = canvas.height - 30;
    this.player = new Player(this);
    this.physics = { gravity: 0.5, jumpForce: -12 };
    this.obstacles = [];
    this.powerUps = [];
    this.obstacleSpeed = 5;
    this.obstacleInterval = 1200;
    this.powerUpInterval = 5000;
    this.lastObstacleTime = performance.now();
    this.lastPowerUpTime = performance.now();
    this.gameOver = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("highScore")) || 0;
    this.scoreMultiplier = 1; // multiplier (1x by default)
    this.lastUpdateTime = performance.now();
    this.parallaxBackground = { x: 0, speed: 1 };
    this.shieldActive = false;
    this.timeSlowed = false;

    // UI
    this.centerMsgEl = document.getElementById("centerMsg");
    this.hudEl = document.getElementById("hud");
    this.showStartMessage();
  }

  showStartMessage() {
    this.centerMsgEl.style.pointerEvents = "none";
    this.centerMsgEl.innerHTML = "Press SPACE to start / jump";
    setTimeout(() => { this.centerMsgEl.innerHTML = ""; }, 1500);
  }

  drawParallaxBackground() {
    // sky
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, this.groundLevel);

    // ground
    ctx.fillStyle = "#6b5e54";
    ctx.fillRect(0, this.groundLevel, canvas.width, canvas.height - this.groundLevel);

    // stars / simple parallax dots
    ctx.fillStyle = "#cccccc";
    for (let i = 0; i < 50; i++) {
      const starX = (i * 50 + this.parallaxBackground.x) % canvas.width;
      ctx.beginPath();
      ctx.arc(starX, (i * 20) % this.groundLevel, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    this.parallaxBackground.x -= this.parallaxBackground.speed;
  }

  drawUI() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${Math.floor(this.score)}`, 10, 25);

    ctx.textAlign = "right";
    ctx.fillText(`High Score: ${this.highScore}`, canvas.width - 10, 25);

    ctx.textAlign = "center";
    if (this.scoreMultiplier > 1) {
      ctx.fillStyle = "#ffd700";
      ctx.fillText(`Multiplier: x${this.scoreMultiplier}`, canvas.width / 2, 25);
    }
    if (this.shieldActive) {
      ctx.fillStyle = "#00bfff";
      ctx.fillText("Shield Active!", canvas.width / 2, 50);
    }
    if (this.timeSlowed) {
      ctx.fillStyle = "#8a2be2";
      ctx.fillText("Time Slowed!", canvas.width / 2, 75);
    }
  }

  generateObstacle(now) {
    const interval = this.timeSlowed ? this.obstacleInterval * 2 : this.obstacleInterval;
    if (now - this.lastObstacleTime > interval) {
      this.obstacles.push(new Obstacle(this));
      this.lastObstacleTime = now;
    }
  }

  generatePowerUp(now) {
    const interval = this.timeSlowed ? this.powerUpInterval * 2 : this.powerUpInterval;
    if (now - this.lastPowerUpTime > interval) {
      this.powerUps.push(new PowerUp(this));
      this.lastPowerUpTime = now;
    }
  }

  checkCollision() {
    // Obstacles
    this.obstacles.forEach((obstacle, index) => {
      if (
        this.player.x < obstacle.x + obstacle.width &&
        this.player.x + this.player.width > obstacle.x &&
        this.player.y < obstacle.y + obstacle.height &&
        this.player.y + this.player.height > obstacle.y
      ) {
        if (this.shieldActive) {
          this.shieldActive = false;
          this.obstacles.splice(index, 1);
        } else {
          this.endGame();
        }
      }
    });

    // Power-ups
    this.powerUps.forEach((powerUp, index) => {
      if (
        this.player.x < powerUp.x + powerUp.width &&
        this.player.x + this.player.width > powerUp.x &&
        this.player.y < powerUp.y + powerUp.height &&
        this.player.y + this.player.height > powerUp.y
      ) {
        this.powerUps.splice(index, 1);
        this.activatePowerUp(powerUp);
      }
    });
  }

  activatePowerUp(powerUp) {
    switch (powerUp.type) {
      case "scoreMultiplier":
        this.scoreMultiplier = 2;
        setTimeout(() => { this.scoreMultiplier = 1; }, powerUp.duration);
        break;
      case "shield":
        this.shieldActive = true;
        setTimeout(() => { this.shieldActive = false; }, powerUp.duration);
        break;
      case "highJump": {
        const originalJump = this.physics.jumpForce;
        this.physics.jumpForce = -18;
        setTimeout(() => { this.physics.jumpForce = originalJump; }, powerUp.duration);
        break;
      }
      case "slowTime":
        this.timeSlowed = true;
        setTimeout(() => { this.timeSlowed = false; }, powerUp.duration);
        break;
    }
  }

  updateDifficulty() {
    const speedMultiplier = this.timeSlowed ? 0.5 : 1;
    this.obstacleSpeed += 0.0005 * speedMultiplier; // small gradual increase
    if (this.obstacleInterval > 500) {
      this.obstacleInterval -= 0.05 * speedMultiplier;
    }
  }

  endGame() {
    this.gameOver = true;
    this.updateHighScore();
    this.centerMsgEl.innerHTML = `<div>GAME OVER<br>Your score: ${Math.floor(this.score)}<br>Press SPACE to restart</div>`;
  }

  updateHighScore() {
    if (Math.floor(this.score) > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem("highScore", this.highScore);
    }
  }

  restart() {
    this.player = new Player(this);
    this.obstacles = [];
    this.powerUps = [];
    this.obstacleSpeed = 5;
    this.obstacleInterval = 1200;
    this.score = 0;
    this.scoreMultiplier = 1;
    this.gameOver = false;
    this.lastObstacleTime = performance.now();
    this.lastPowerUpTime = performance.now();
    this.shieldActive = false;
    this.timeSlowed = false;
    this.centerMsgEl.innerHTML = "";
    this.lastUpdateTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  gameLoop(timestamp) {
    if (this.gameOver) return;

    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawParallaxBackground();

    // update entities
    this.player.update();
    this.obstacles.forEach(o => o.update());
    this.powerUps.forEach(p => p.update());

    const now = performance.now();
    this.generateObstacle(now);
    this.generatePowerUp(now);
    this.checkCollision();
    this.updateDifficulty();

    // Score increases by time * multiplier (scaled)
    this.score += (deltaTime / 1000) * (10 * this.scoreMultiplier);

    // remove off-screen items
    this.obstacles = this.obstacles.filter(o => o.x + o.width > 0);
    this.powerUps = this.powerUps.filter(p => p.x + p.width > 0);

    // draw
    this.player.draw();
    this.obstacles.forEach(o => o.draw());
    this.powerUps.forEach(p => p.draw());
    this.drawUI();

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// --- Event Listeners ---
const myGame = new Game();

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (myGame.gameOver) {
      myGame.restart();
    } else {
      myGame.player.jump();
    }
  }
});

// Start the loop
myGame.lastUpdateTime = performance.now();
requestAnimationFrame(myGame.gameLoop.bind(myGame));
