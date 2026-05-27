// ============================================================
// Week 3 Example 2: Full Fighting Game (Portal Edition)
// ============================================================

// ------------------------------------------------------------
// GAME STATES
// ------------------------------------------------------------
const STATE_START = "start";
const STATE_FIGHT = "fight";
const STATE_WIN   = "win";

let gameState = STATE_START;
let winner = null; 

// ------------------------------------------------------------
// SOUNDS, IMAGES & SPRITES
// ------------------------------------------------------------
let punchSound; 
let winSound;
let bgMusic;

// Background Images
let startBg;
let fightBg;
let winBg;

// Character Sprites
let martSprite;
let telefraggerSprite;

// ------------------------------------------------------------
// FIGHTER CLASS
// ------------------------------------------------------------
class Fighter {
  constructor(x, y, spriteImg, controls, label) {
    // Position and physics
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.speed = 0.5;
    this.maxSpeed = 4;
    this.friction = 0.78;
    this.r = 35; 

    // Appearance
    this.sprite = spriteImg;
    this.label = label; 

    // Controls
    this.controls = controls;

    // Health — 3 hits to lose
    this.maxHealth = 3;
    this.health = 3;

    // Attack state
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackDuration = 18;  
    this.attackCooldown = 0;   
    this.punchReach = 60;      
    this.punchDir = 1;         

    // Block state
    this.isBlocking = false;

    // Hit flash
    this.hitFlash = 0;

    // Prevents registering more than one hit per attack swing
    this.hitLanded = false;
  }

  update() {
    if (gameState !== STATE_FIGHT) return;

    this.handleInput();
    this.applyPhysics();

    if (this.isAttacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.hitLanded = false;
        this.attackCooldown = 20; 
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hitFlash > 0) this.hitFlash--;
  }

  handleInput() {
    if (keyIsDown(this.controls.left))  this.vx -= this.speed;
    if (keyIsDown(this.controls.right)) this.vx += this.speed;

    this.vx = constrain(this.vx, -this.maxSpeed, this.maxSpeed);

    if (!keyIsDown(this.controls.left) && !keyIsDown(this.controls.right)) {
      this.vx *= this.friction;
    }

    this.isBlocking = keyIsDown(this.controls.block);
  }

  applyPhysics() {
    this.x += this.vx;
    this.x = constrain(this.x, this.r, width - this.r);
  }

  startAttack(targetX) {
    if (this.isAttacking || this.attackCooldown > 0) return;

    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.hitLanded = false;

    this.punchDir = targetX > this.x ? 1 : -1;

    punchSound.play();
  }

  getPunchX() {
    return this.x + this.punchDir * this.punchReach;
  }

  takeHit() {
    if (this.isBlocking) return; 

    this.health--;
    this.hitFlash = 12; 

    if (this.health <= 0) {
      this.health = 0;
      endGame(this.label === "P1" ? "P2" : "P1");
    }
  }

  draw() {
    push();

    // Shield ring when blocking
    if (this.isBlocking) {
      noFill();
      stroke(0, 191, 255, 180); 
      strokeWeight(4);
      ellipse(this.x, this.y, (this.r + 15) * 2, (this.r + 15) * 2);
    }

    // Draw teleport/punch projectile indicator when attacking
    if (this.isAttacking) {
      fill(this.hitFlash > 0 ? color(255) : color(255, 165, 0)); 
      noStroke();
      ellipse(this.getPunchX(), this.y, 22, 22);
    }

    // Translate to character position for image processing
    translate(this.x, this.y);

    // Dynamic horizontal flip tracking based on punch direction orientation
    if (this.punchDir === -1) {
      scale(-1, 1);
    }

    // Apply bright flash tint when damaged
    if (this.hitFlash > 0) {
      tint(255, 100, 100); 
    } else {
      noTint();
    }

    // Render character sprite image centered on its coordinates
    imageMode(CENTER);
    image(this.sprite, 0, 0, this.r * 2, this.r * 2);

    pop();
  }
}

// ============================================================
// GLOBAL VARIABLES
// ============================================================
let fighter1, fighter2;
let groundY;

// ============================================================
// preload()
// ============================================================
function preload() {
  punchSound = loadSound("assets/sounds/teleport.mp3");
  winSound   = loadSound("assets/sounds/winmusic.ogg");
  bgMusic    = loadSound("assets/sounds/backgroundmusic.mp3");

  startBg = loadImage("assets/images/portal2background.jpg"); 
  fightBg = loadImage("assets/images/portalfightbackground.jpg");
  winBg   = loadImage("assets/images/portalwin.jpg");

  martSprite        = loadImage("assets/images/mart.png");
  telefraggerSprite = loadImage("assets/images/telefragger.png");
}

// ============================================================
// setup()
// ============================================================
function setup() {
  createCanvas(800, 450);
  groundY = height - 80;
  setupFighters();
}

function setupFighters() {
  fighter1 = new Fighter(
    200,
    groundY - 35,
    martSprite, 
    { left: 65, right: 68, attack: 70, block: 71 }, 
    "P1"
  );

  fighter2 = new Fighter(
    600,
    groundY - 35,
    telefraggerSprite, 
    { left: LEFT_ARROW, right: RIGHT_ARROW, attack: 75, block: 76 }, 
    "P2"
  );
  
  fighter1.punchDir = 1;
  fighter2.punchDir = -1;
}

// ============================================================
// draw()
// ============================================================
function draw() {
  if (gameState === STATE_START) {
    image(startBg, 0, 0, width, height);
    drawStartScreen();
  } else if (gameState === STATE_FIGHT) {
    image(fightBg, 0, 0, width, height);
    drawArena();
    updateAndDrawFighters();
    checkHits();
    drawHealthBars();
    drawFightHUD();
  } else if (gameState === STATE_WIN) {
    image(winBg, 0, 0, width, height);
    drawArena();
    fighter1.draw();
    fighter2.draw();
    drawWinScreen();
  }
}

// ============================================================
// GAME STATE FUNCTIONS
// ============================================================
function startGame() {
  gameState = STATE_FIGHT;
  winner = null;

  // Stops the win audio track immediately if resetting or rematching
  winSound.stop();

  setupFighters();
  if (!bgMusic.isPlaying()) {
    bgMusic.loop();
  }
}

function endGame(winnerLabel) {
  gameState = STATE_WIN;
  winner = winnerLabel;
  bgMusic.stop();
  winSound.play();
}

// ============================================================
// DRAW FUNCTIONS
// ============================================================
function drawStartScreen() {
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER);
  textSize(52);
  text("PORTAL BRAWL", width / 2, height / 2 - 60);

  fill(160);
  textSize(18);
  text("First to land 3 tele-frags wins", width / 2, height / 2 - 20);

  textSize(14);
  fill(0, 200, 180);
  text("P1 (Mart): A/D move   F attack   G block", width / 2, height / 2 + 30);
  fill(255, 150, 30);
  text("P2 (Telefragger): Arrows move   K attack   L block", width / 2, height / 2 + 55);

  fill(255);
  textSize(16);
  text("Press ENTER to start", width / 2, height / 2 + 110);
}

function drawWinScreen() {
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  fill(winner === "P1" ? color(0, 200, 180) : color(255, 150, 30));
  textAlign(CENTER);
  textSize(56);
  text(winner + " WINS!", width / 2, height / 2 - 30);

  fill(255);
  textSize(18);
  text("Press ENTER to rematch", width / 2, height / 2 + 40);
}

function drawArena() {
  fill(30, 30, 30, 200);
  noStroke();
  rect(0, groundY, width, height - groundY);

  stroke(100);
  strokeWeight(2);
  line(0, groundY, width, groundY);
}

function updateAndDrawFighters() {
  fighter1.update();
  fighter2.update();
  
  if (gameState === STATE_FIGHT && !fighter1.isAttacking) {
    fighter1.punchDir = fighter2.x > fighter1.x ? 1 : -1;
  }
  if (gameState === STATE_FIGHT && !fighter2.isAttacking) {
    fighter2.punchDir = fighter1.x > fighter2.x ? 1 : -1;
  }

  fighter1.draw();
  fighter2.draw();
}

// ------------------------------------------------------------
// checkHits()
// ------------------------------------------------------------
function checkHits() {
  if (fighter1.isAttacking && !fighter1.hitLanded) {
    let fistX = fighter1.getPunchX();
    let dist = abs(fistX - fighter2.x);
    if (dist < fighter2.r + 15) {
      fighter2.takeHit();
      fighter1.hitLanded = true;
    }
  }

  if (fighter2.isAttacking && !fighter2.hitLanded) {
    let fistX = fighter2.getPunchX();
    let dist = abs(fistX - fighter1.x);
    if (dist < fighter1.r + 15) {
      fighter1.takeHit();
      fighter2.hitLanded = true;
    }
  }
}

function drawHealthBars() {
  let barW    = 200;
  let barH    = 18;
  let barY    = 45;
  let padding = 30;

  let p1W = map(fighter1.health, 0, fighter1.maxHealth, 0, barW);
  fill(40);
  rect(padding, barY, barW, barH, 4);
  fill(0, 200, 180);
  rect(padding, barY, p1W, barH, 4);

  let p2W = map(fighter2.health, 0, fighter2.maxHealth, 0, barW);
  fill(40);
  rect(width - padding - barW, barY, barW, barH, 4);
  fill(255, 150, 30);
  rect(width - padding - p2W, barY, p2W, barH, 4);

  fill(255);
  textSize(13);
  noStroke();
  textAlign(LEFT);
  text("P1 (Mart)", padding, barY - 5);
  textAlign(RIGHT);
  text("P2 (Telefragger)", width - padding, barY - 5);
}

function drawFightHUD() {
  noStroke();
  fill(220); 
  textSize(12);
  textAlign(LEFT);
  text("A/D move   F attack   G block", 16, height - 12);
  textAlign(RIGHT);
  text("Arrows move   K attack   L block", width - 16, height - 12);
}

// ============================================================
// KEY EVENTS
// ============================================================
function keyPressed() {
  if (keyCode === ENTER) {
    if (gameState === STATE_START || gameState === STATE_WIN) {
      startGame();
    }
  }

  if (keyCode === 70 && gameState === STATE_FIGHT) {
    fighter1.startAttack(fighter2.x);
  }

  if (keyCode === 75 && gameState === STATE_FIGHT) {
    fighter2.startAttack(fighter1.x);
  }
}