/*
  Week 9 Side Quest
  Based on Side Quest 6
  Added:
  - Debug screen
  - Moon gravity toggle
  - Invincible mode toggle
  - Show hitboxes toggle
  - Level 2 bonus
*/

let player;
let sensor;
let playerImg, bgImg;

let jumpSound, attackSound, collectSound, damageSound, music, stepSound;
let audioStarted = false;
let stepCooldown = 0;

let collectibles = [];
let enemies = [];

let ground, groundDeep;
let groundImg, groundDeepImg;

let attacking = false;
let attackFrameCounter = 0;

let debugMenuOpen = false;
let moonGravity = false;
let invincibleMode = false;
let showHitboxes = false;

const NORMAL_GRAVITY = 10;
const MOON_GRAVITY = 2;

let currentLevelIndex = 0;
let levelObjects = [];

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

const VIEWW = 320;
const VIEWH = 180;

const TILE_W = 24;
const TILE_H = 24;

const FRAME_W = 32;
const FRAME_H = 32;

const MAP_START_Y = VIEWH - TILE_H * 4;

const levels = [
  {
    map: [
      "              ",
      "              ",
      "              ",
      "              ",
      "              ",
      "       ggg    ",
      "gggggggggggggg",
      "dddddddddddddd",
    ],
    playerStart: { x: FRAME_W, y: MAP_START_Y },
    collectibles: [
      { x: 5 * TILE_W, y: 4 * TILE_H, r: 8, collected: false },
      { x: 10 * TILE_W, y: 4 * TILE_H, r: 8, collected: false },
    ],
    enemies: [{ x: 11 * TILE_W, y: 5 * TILE_H }],
  },
  {
    map: [
      "              ",
      "              ",
      "        g     ",
      "     ggggg    ",
      "   g       g  ",
      "       ggg    ",
      "gggggggggggggg",
      "dddddddddddddd",
    ],
    playerStart: { x: FRAME_W, y: 2 * TILE_H },
    collectibles: [
      { x: 8 * TILE_W, y: 2 * TILE_H, r: 8, collected: false },
      { x: 4 * TILE_W, y: 4 * TILE_H, r: 8, collected: false },
      { x: 11 * TILE_W, y: 4 * TILE_H, r: 8, collected: false },
    ],
    enemies: [
      { x: 6 * TILE_W, y: 5 * TILE_H },
      { x: 11 * TILE_W, y: 5 * TILE_H },
    ],
  },
];

function preload() {
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  jumpSound = loadSound("assets/jump.flac");
  attackSound = loadSound("assets/attack.mp3");
  collectSound = loadSound("assets/collect.wav");
  damageSound = loadSound("assets/damage.wav");
  music = loadSound("assets/background_music.flac");
  stepSound = loadSound("assets/step.flac");
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;

  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  player = new Sprite(FRAME_W, MAP_START_Y, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;

  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4;
  player.addAnis(playerAnis);
  player.ani = "idle";
  player.w = 18;
  player.h = 20;
  player.friction = 0;
  player.bounciness = 0;

  sensor = new Sprite();
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;
  textFont("monospace");
  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;

  music.setVolume(0.25);

  applyGravity();
  loadLevel(0);
}

function draw() {
  background(20);

  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, VIEWW, VIEWH);
  camera.on();

  let grounded = sensor.overlapping(ground);

  updateCollectibles();
  updateEnemies();

  if (stepCooldown > 0) stepCooldown--;

  if (grounded && !attacking && kb.presses("space")) {
    startAudioIfNeeded();
    if (attackSound) attackSound.play();

    attacking = true;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play();

    attackEnemies();
  }

  if (grounded && kb.presses("up")) {
    startAudioIfNeeded();
    player.vel.y = -4;
    if (jumpSound) jumpSound.play();
  }

  if (attacking) {
    attackFrameCounter++;
    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
    }
  } else if (!grounded) {
    player.ani = "jump";
    player.ani.frame = player.vel.y < 0 ? 0 : 1;
  } else {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  if (!attacking) {
    player.vel.x = 0;

    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;

      if (grounded && stepCooldown === 0) {
        startAudioIfNeeded();
        if (stepSound) stepSound.play();
        stepCooldown = 14;
      }
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;

      if (grounded && stepCooldown === 0) {
        startAudioIfNeeded();
        if (stepSound) stepSound.play();
        stepCooldown = 14;
      }
    }
  }

  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  drawCollectibles();
  drawUI();

  if (showHitboxes) {
    drawHitboxes();
  }

  if (debugMenuOpen) {
    drawDebugMenu();
  }

  checkLevelComplete();
}

function loadLevel(index) {
  currentLevelIndex = index;

  clearLevelSprites();

  const levelData = levels[index];

  new Tiles(levelData.map, 0, 0, TILE_W, TILE_H);

  player.pos.x = levelData.playerStart.x;
  player.pos.y = levelData.playerStart.y;
  player.vel.x = 0;
  player.vel.y = 0;
  player.ani = "idle";

  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;

  collectibles = levelData.collectibles.map((c) => ({
    x: c.x,
    y: c.y,
    r: c.r,
    collected: false,
  }));

  enemies = [];
  for (let e of levelData.enemies) {
    let enemy = new Sprite(e.x, e.y, 18, 18, "dynamic");
    enemy.color = "red";
    enemy.rotationLock = true;
    enemy.vel.x = 1;
    enemy.alive = true;
    enemies.push(enemy);
    levelObjects.push(enemy);
  }
}

function clearLevelSprites() {
  for (let obj of levelObjects) {
    if (obj && !obj.removed) obj.remove();
  }
  levelObjects = [];

  if (ground && ground.length > 0) {
    for (let i = ground.length - 1; i >= 0; i--) ground[i].remove();
  }
  if (groundDeep && groundDeep.length > 0) {
    for (let i = groundDeep.length - 1; i >= 0; i--) groundDeep[i].remove();
  }
}

function updateCollectibles() {
  for (let c of collectibles) {
    if (c.collected) continue;

    let d = dist(player.x, player.y, c.x, c.y);
    if (d < 18) {
      c.collected = true;
      startAudioIfNeeded();
      if (collectSound) collectSound.play();
    }
  }
}

function drawCollectibles() {
  push();
  noStroke();

  for (let c of collectibles) {
    if (c.collected) continue;

    fill(80, 220, 255);
    circle(c.x, c.y, c.r * 2);

    fill(180, 255, 255);
    circle(c.x - 2, c.y - 2, 4);
  }

  pop();
}

function updateEnemies() {
  for (let e of enemies) {
    if (!e.alive) continue;

    if (e.x < 9 * TILE_W) e.vel.x = 1;
    if (e.x > 12 * TILE_W) e.vel.x = -1;

    if (!invincibleMode && player.overlapping(e) && frameCount % 30 === 0) {
      startAudioIfNeeded();
      if (damageSound) damageSound.play();
    }
  }
}

function attackEnemies() {
  for (let e of enemies) {
    if (!e.alive) continue;

    let hit = false;
    let dx = abs(player.x - e.x);
    let dy = abs(player.y - e.y);

    if (dx < 28 && dy < 20) {
      if (player.mirror.x && e.x < player.x) hit = true;
      if (!player.mirror.x && e.x > player.x) hit = true;
    }

    if (hit) {
      e.alive = false;
      e.remove();
    }
  }
}

function drawUI() {
  push();

  fill(0, 140);
  rect(8, 8, 180, 42, 6); // 更小的框

  fill(255);
  textSize(10); // 字体缩小

  text("Level: " + (currentLevelIndex + 1), 14, 22);
  text("Collect: " + collectedCount() + " / " + collectibles.length, 14, 34);

  // 单独一行提示
  textSize(9);
  text("TAB Debug | N Next", 14, 44);

  pop();
}

function drawHitboxes() {
  push();
  noFill();
  strokeWeight(1);

  stroke(0, 255, 0);
  rect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);

  stroke(255, 255, 0);
  rect(sensor.x - sensor.w / 2, sensor.y - sensor.h / 2, sensor.w, sensor.h);

  stroke(255, 0, 0);
  for (let e of enemies) {
    if (e.alive) {
      rect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
    }
  }

  pop();
}

function drawDebugMenu() {
  push();

  fill(0, 180);
  rect(8, 55, 180, 85, 8); // 整体缩小

  fill(255);
  textSize(10);

  text("DEBUG", 16, 70);

  text("G: Gravity " + (moonGravity ? "ON" : "OFF"), 16, 85);
  text("I: Invincible " + (invincibleMode ? "ON" : "OFF"), 16, 100);
  text("H: Hitbox " + (showHitboxes ? "ON" : "OFF"), 16, 115);
  text("R: Reload", 16, 130);

  pop();
}

function collectedCount() {
  let count = 0;
  for (let c of collectibles) {
    if (c.collected) count++;
  }
  return count;
}

function checkLevelComplete() {
  if (
    collectedCount() === collectibles.length &&
    currentLevelIndex < levels.length - 1
  ) {
    push();
    fill(0, 170);
    rect(40, 70, 240, 40, 10);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("Press N for Next Level", width / 2, 90);
    textAlign(LEFT, BASELINE);
    pop();
  }
}

function applyGravity() {
  world.gravity.y = moonGravity ? MOON_GRAVITY : NORMAL_GRAVITY;
}

function startAudioIfNeeded() {
  if (!audioStarted) {
    userStartAudio();

    if (music && !music.isPlaying()) {
      music.loop();
    }

    audioStarted = true;
  }
}

function mousePressed() {
  startAudioIfNeeded();
}

function keyPressed() {
  startAudioIfNeeded();

  if (keyCode === TAB) {
    debugMenuOpen = !debugMenuOpen;
    return false;
  }

  if (key === "g" || key === "G") {
    moonGravity = !moonGravity;
    applyGravity();
  }

  if (key === "i" || key === "I") {
    invincibleMode = !invincibleMode;
  }

  if (key === "h" || key === "H") {
    showHitboxes = !showHitboxes;
  }

  if (key === "r" || key === "R") {
    loadLevel(currentLevelIndex);
  }

  if ((key === "n" || key === "N") && currentLevelIndex < levels.length - 1) {
    if (collectedCount() === collectibles.length) {
      loadLevel(currentLevelIndex + 1);
    }
  }
}
