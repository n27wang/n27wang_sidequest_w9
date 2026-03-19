/*
  Week 6 — Example 2: Tile-Based Level & Basic Movement
  Updated with sound, collectibles, enemy, and background music
*/

let player;
let sensor;
let playerImg, bgImg;

let jumpSound, attackSound, collectSound, damageSound, music, stepSound;
let audioStarted = false;
let stepCooldown = 0;

let collectibles = [];
let enemies = [];

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep;
let groundImg, groundDeepImg;

let attacking = false;
let attackFrameCounter = 0;

// --- TILE MAP ---
let level = [
  "              ",
  "              ",
  "              ",
  "              ",
  "              ",
  "       ggg    ",
  "gggggggggggggg",
  "dddddddddddddd",
];

// --- LEVEL CONSTANTS ---
const VIEWW = 320,
  VIEWH = 180;

const TILE_W = 24,
  TILE_H = 24;

const FRAME_W = 32,
  FRAME_H = 32;

const MAP_START_Y = VIEWH - TILE_H * 4;
const GRAVITY = 10;
music = loadSound("assets/background_music.flac");

function preload() {
  // --- IMAGES ---
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  // --- SOUNDS ---
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

  world.gravity.y = GRAVITY;

  // --- TILE GROUPS ---
  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  new Tiles(level, 0, 0, TILE_W, TILE_H);

  // --- PLAYER ---
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

  // --- GROUND SENSOR ---
  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;

  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;

  makeCollectibles();
  makeEnemies();

  if (music) {
    music.setVolume(0.25);
  }
}

function draw() {
  // --- BACKGROUND ---
  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, VIEWW, VIEWH);
  camera.on();

  updateCollectibles();
  updateEnemies();

  // --- PLAYER CONTROLS ---
  let grounded = sensor.overlapping(ground);

  if (stepCooldown > 0) stepCooldown--;

  // --- ATTACK INPUT ---
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

  // --- JUMP ---
  if (grounded && kb.presses("up")) {
    startAudioIfNeeded();
    player.vel.y = -4;
    if (jumpSound) jumpSound.play();
  }

  // --- STATE MACHINE ---
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

  // --- MOVEMENT ---
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

  // --- KEEP IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  drawCollectibles();
  drawUI();
}

function makeCollectibles() {
  collectibles = [
    { x: 5 * TILE_W, y: 4 * TILE_H, r: 8, collected: false },
    { x: 10 * TILE_W, y: 4 * TILE_H, r: 8, collected: false },
  ];
}

function makeEnemies() {
  let enemy = new Sprite(11 * TILE_W, 5 * TILE_H, 18, 18, "dynamic");
  enemy.color = "red";
  enemy.rotationLock = true;
  enemy.vel.x = 1;
  enemy.alive = true;
  enemies.push(enemy);
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

    if (player.overlapping(e) && frameCount % 30 === 0) {
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
  fill(0, 150);
  rect(10, 10, 170, 55, 8);

  fill(255);
  textSize(14);
  text("Collect: " + collectedCount() + " / " + collectibles.length, 20, 30);
  text("Move: ← → / Jump: ↑ / Attack: Space", 20, 50);
  pop();
}

function collectedCount() {
  let count = 0;
  for (let c of collectibles) {
    if (c.collected) count++;
  }
  return count;
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
}
